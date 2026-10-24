import { loadStore, saveStore } from "../journal";
import type { ProgressData, AccountSnapshot, DeletedRecord } from "./types";
import { EMPTY_ACCOUNT_SNAPSHOT } from "./types";

export const PROGRESS_KEY = "loc.progress.v1";
export const SYNC_META_KEY = "loc.sync.v1";
export const LOCAL_CHANGE_EVENT = "loc:local-change";
export const LOCAL_REFRESH_EVENT = "loc:refresh";

interface SyncMetadata {
  progressUpdatedAt?: string | null;
  progressVersions?: Record<string, string>;
  deletedEntries?: DeletedRecord[];
  deletedPrayers?: DeletedRecord[];
}

function readMetadata(): SyncMetadata {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return {};
    return value as SyncMetadata;
  } catch {
    return {};
  }
}

function readProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_ACCOUNT_SNAPSHOT.progress;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return EMPTY_ACCOUNT_SNAPSHOT.progress;
    const progress = value as Partial<ProgressData>;
    return {
      completed: progress.completed ?? {},
      answers: progress.answers ?? {},
      level: progress.level === "intermediate" || progress.level === "indepth" ? progress.level : "beginner",
    };
  } catch {
    return EMPTY_ACCOUNT_SNAPSHOT.progress;
  }
}

export function readLocalSnapshot(): AccountSnapshot {
  const metadata = readMetadata();
  const progressExists = localStorage.getItem(PROGRESS_KEY) !== null;
  const progress = readProgress();
  const fallbackVersion = metadata.progressUpdatedAt ?? (progressExists ? new Date(0).toISOString() : null);
  const progressVersions = { ...(metadata.progressVersions ?? {}) };
  if (fallbackVersion) {
    for (const key of Object.keys(progress.completed)) progressVersions[`completed:${key}`] ??= fallbackVersion;
    for (const key of Object.keys(progress.answers)) progressVersions[`answers:${key}`] ??= fallbackVersion;
    progressVersions.level ??= fallbackVersion;
  }
  return {
    ...EMPTY_ACCOUNT_SNAPSHOT,
    ...loadStore(),
    progress,
    progressUpdatedAt: fallbackVersion,
    progressVersions,
    deletedEntries: metadata.deletedEntries ?? [],
    deletedPrayers: metadata.deletedPrayers ?? [],
  };
}

export function writeLocalSnapshot(snapshot: AccountSnapshot): boolean {
  try {
    if (!saveStore({ entries: snapshot.entries, prayers: snapshot.prayers })) return false;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(snapshot.progress));
    localStorage.setItem(SYNC_META_KEY, JSON.stringify({
      progressUpdatedAt: snapshot.progressUpdatedAt,
      progressVersions: snapshot.progressVersions,
      deletedEntries: snapshot.deletedEntries,
      deletedPrayers: snapshot.deletedPrayers,
    } satisfies SyncMetadata));
    window.dispatchEvent(new Event(LOCAL_REFRESH_EVENT));
    return true;
  } catch {
    return false;
  }
}

function mergeRecords<T extends { id: string; updatedAt: string }>(
  preferred: T[],
  secondary: T[],
  deleted: DeletedRecord[],
): T[] {
  const merged = new Map<string, T>();
  for (const record of [...secondary, ...preferred]) {
    const previous = merged.get(record.id);
    if (!previous || record.updatedAt >= previous.updatedAt) merged.set(record.id, record);
  }
  const removedAt = new Map(deleted.map((record) => [record.id, record.deletedAt]));
  return Array.from(merged.values())
    .filter((record) => !removedAt.has(record.id) || record.updatedAt > removedAt.get(record.id)!)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mergeDeleted(a: DeletedRecord[], b: DeletedRecord[]): DeletedRecord[] {
  const merged = new Map<string, DeletedRecord>();
  for (const item of [...a, ...b]) {
    const previous = merged.get(item.id);
    if (!previous || item.deletedAt > previous.deletedAt) merged.set(item.id, item);
  }
  return Array.from(merged.values());
}

function mergeProgress(local: AccountSnapshot, remote: AccountSnapshot): {
  progress: ProgressData;
  updatedAt: string | null;
  versions: Record<string, string>;
} {
  const versions: Record<string, string> = {};
  const newerValue = <T>(key: string, localValue: T | undefined, remoteValue: T | undefined): T | undefined => {
    const localAt = local.progressVersions[key] ?? local.progressUpdatedAt ?? "";
    const remoteAt = remote.progressVersions[key] ?? remote.progressUpdatedAt ?? "";
    const value = localValue !== undefined && (remoteValue === undefined || localAt > remoteAt)
      ? localValue
      : remoteValue !== undefined ? remoteValue : localValue;
    const version = value === localValue && localValue !== undefined ? localAt : remoteAt;
    if (version) versions[key] = version;
    return value;
  };
  const completed: Record<string, boolean> = {};
  for (const key of new Set([...Object.keys(local.progress.completed), ...Object.keys(remote.progress.completed)])) {
    const value = newerValue(`completed:${key}`, local.progress.completed[key], remote.progress.completed[key]);
    if (value !== undefined) completed[key] = value;
  }
  const answers: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(local.progress.answers), ...Object.keys(remote.progress.answers)])) {
    const value = newerValue(`answers:${key}`, local.progress.answers[key], remote.progress.answers[key]);
    if (value !== undefined) answers[key] = value;
  }
  const level = newerValue("level", local.progress.level, remote.progress.level) ?? "beginner";
  const updatedAt = [local.progressUpdatedAt, remote.progressUpdatedAt].filter((value): value is string => !!value).sort().at(-1) ?? null;
  return { progress: { completed, answers, level }, updatedAt, versions };
}

export function mergeAccountSnapshots(local: AccountSnapshot, remote: AccountSnapshot): AccountSnapshot {
  const deletedEntries = mergeDeleted(local.deletedEntries, remote.deletedEntries);
  const deletedPrayers = mergeDeleted(local.deletedPrayers, remote.deletedPrayers);
  const entries = mergeRecords(local.entries, remote.entries, deletedEntries);
  const prayers = mergeRecords(local.prayers, remote.prayers, deletedPrayers);
  const entryIds = new Set(entries.map((entry) => entry.id));
  const prayerIds = new Set(prayers.map((prayer) => prayer.id));
  const linkedEntries = entries.map((entry) => ({
    ...entry,
    prayerId: entry.prayerId && prayerIds.has(entry.prayerId) ? entry.prayerId : undefined,
  }));
  const linkedEntryIds = new Set(linkedEntries.map((entry) => entry.id));
  const linkedPrayers = prayers.map((prayer) => ({
    ...prayer,
    journalEntryId: prayer.journalEntryId && entryIds.has(prayer.journalEntryId) ? prayer.journalEntryId : undefined,
  })).map((prayer) => {
    const entry = linkedEntries.find((candidate) => candidate.id === prayer.journalEntryId);
    return entry?.prayerId === prayer.id ? prayer : { ...prayer, journalEntryId: undefined };
  });
  const consistentEntries = linkedEntries.map((entry) => {
    const prayer = linkedPrayers.find((candidate) => candidate.id === entry.prayerId);
    return prayer?.journalEntryId && linkedEntryIds.has(prayer.journalEntryId) ? entry : { ...entry, prayerId: undefined };
  });
  const progress = mergeProgress(local, remote);
  return {
    version: 1,
    entries: consistentEntries,
    prayers: linkedPrayers,
    progress: progress.progress,
    progressUpdatedAt: progress.updatedAt,
    progressVersions: progress.versions,
    deletedEntries,
    deletedPrayers,
  };
}

export function recordLocalChange(options: {
  deletedEntries?: string[];
  deletedPrayers?: string[];
  progressChanged?: boolean;
  progressKeys?: string[];
} = {}): void {
  const metadata = readMetadata();
  const now = new Date().toISOString();
  const addTombstones = (existing: DeletedRecord[] | undefined, ids: string[] | undefined) => {
    const records = new Map((existing ?? []).map((record) => [record.id, record]));
    for (const id of ids ?? []) records.set(id, { id, deletedAt: now });
    return Array.from(records.values());
  };
  const progressVersions = { ...(metadata.progressVersions ?? {}) };
  if (options.progressChanged) {
    progressVersions.level ??= metadata.progressUpdatedAt ?? new Date(0).toISOString();
    for (const key of options.progressKeys ?? []) progressVersions[key] = now;
  }
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({
    ...metadata,
    ...(options.progressChanged ? { progressUpdatedAt: now } : {}),
    progressVersions,
    deletedEntries: addTombstones(metadata.deletedEntries, options.deletedEntries),
    deletedPrayers: addTombstones(metadata.deletedPrayers, options.deletedPrayers),
  } satisfies SyncMetadata));
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}

export function clearDeletionMark(kind: "entry" | "prayer", id: string): void {
  const metadata = readMetadata();
  const key = kind === "entry" ? "deletedEntries" : "deletedPrayers";
  const records = metadata[key]?.filter((record) => record.id !== id) ?? [];
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...metadata, [key]: records } satisfies SyncMetadata));
}
