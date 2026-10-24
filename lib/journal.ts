import type { Lesson } from "./lessons";
import { lessonId } from "./lessons";
import { EMOTIONS, LANGUAGES, LENGTHS } from "./prayer/types";
import type { Emotion, PrayerLanguage, PrayerLength, ScriptureItem } from "./prayer/types";

// Browser storage (localStorage) in a versioned envelope so Stage 5 can migrate it to the database.
// See docs/MIGRATION.md. Stage 2's progress key is untouched.
// The storage KEY keeps its original name on purpose: renaming it would orphan existing users' entries.
// Versions: 1 = { entries } (Stage 3).  2 = { entries, prayers } (Stage 4).
export const JOURNAL_KEY = "loc.journal.v1";
export const JOURNAL_BACKUP_KEY = "loc.journal.v1.corrupt-backup";
export const SCHEMA_VERSION = 2;

export interface Reflection { prompt: string; answer: string }
export interface Review { at: string; correct: boolean | null }
export interface JournalEntry {
  id: string;                 // stable, never changes after creation
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
  source: "lesson" | "free" | "prayer";
  lessonId?: string;          // e.g. "genesis-1"
  bookSlug?: string;
  chapter?: number;
  lessonTitle?: string;
  ref?: string;               // Scripture reference, e.g. "Genesis 1:1–5"
  prayerId?: string;          // Stage 4: the SavedPrayer this entry was created from
  guided: { god: string; self: string; apply: string; pray: string };
  lessonReflections: Reflection[]; // copied from Stage 2 reflection answers
  notes: string;
  tags: string[];
  favorite: boolean;
  reviews: Review[];
}

/** Stage 4: a prayer the user chose to save. Stays on this device only. */
export interface SavedPrayer {
  id: string;                 // stable, never changes after creation
  createdAt: string;
  updatedAt: string;
  situation: string;          // the user's own words
  emotion?: Emotion;
  language: PrayerLanguage;
  length: PrayerLength;
  text: string;               // the prayer as the user last edited it
  origin: "ai" | "edited" | "written"; // AI-generated as-is, AI-generated then edited, or written entirely by the user
  scripture: ScriptureItem[]; // verified KJV references (snapshot at save time)
  journalEntryId?: string;    // link to the journal entry created from this prayer
}
interface Envelope { version: number; entries: JournalEntry[]; prayers?: SavedPrayer[] }

export const GUIDED_PROMPTS: { key: keyof JournalEntry["guided"]; label: string }[] = [
  { key: "god", label: "What did I learn about God?" },
  { key: "self", label: "What did I learn about myself?" },
  { key: "apply", label: "How can I apply this today?" },
  { key: "pray", label: "What do I want to pray about?" },
];

export function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "e-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

const emptyGuided = () => ({ god: "", self: "", apply: "", pray: "" });

function normalize(e: Partial<JournalEntry>): JournalEntry {
  const now = new Date().toISOString();
  return {
    id: e.id || newId(),
    createdAt: e.createdAt || now,
    updatedAt: e.updatedAt || e.createdAt || now,
    source: e.source === "lesson" ? "lesson" : e.source === "prayer" ? "prayer" : "free",
    lessonId: e.lessonId, bookSlug: e.bookSlug, chapter: e.chapter, lessonTitle: e.lessonTitle, ref: e.ref,
    prayerId: typeof e.prayerId === "string" ? e.prayerId : undefined,
    guided: { ...emptyGuided(), ...(e.guided ?? {}) },
    lessonReflections: Array.isArray(e.lessonReflections) ? e.lessonReflections : [],
    notes: e.notes ?? "",
    tags: Array.isArray(e.tags) ? e.tags : [],
    favorite: !!e.favorite,
    reviews: Array.isArray(e.reviews) ? e.reviews : [],
  };
}

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
function normalizeScripture(x: unknown): ScriptureItem | null {
  const o = x as Partial<ScriptureItem> | null;
  if (!o || typeof o !== "object" || typeof o.ref !== "string" || typeof o.quote !== "string") return null;
  return {
    id: str(o.id, o.ref), ref: o.ref, translation: "KJV", quote: o.quote, paraphrase: str(o.paraphrase),
    why: str(o.why), whySource: o.whySource === "ai" ? "ai" : "curated",
  };
}

export function normalizePrayer(p: Partial<SavedPrayer>): SavedPrayer {
  const now = new Date().toISOString();
  return {
    id: p.id || newId(),
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || p.createdAt || now,
    situation: str(p.situation),
    emotion: (EMOTIONS as readonly string[]).includes(p.emotion as string) ? p.emotion : undefined,
    language: (LANGUAGES as readonly string[]).includes(p.language as string) ? (p.language as PrayerLanguage) : "en",
    length: (LENGTHS as readonly string[]).includes(p.length as string) ? (p.length as PrayerLength) : "concise",
    text: str(p.text),
    origin: p.origin === "ai" || p.origin === "edited" ? p.origin : "written",
    scripture: Array.isArray(p.scripture) ? p.scripture.map(normalizeScripture).filter((x): x is ScriptureItem => !!x) : [],
    journalEntryId: typeof p.journalEntryId === "string" ? p.journalEntryId : undefined,
  };
}

export interface Store { entries: JournalEntry[]; prayers: SavedPrayer[] }

/** Upgrade any older shape to the current store. Add a case here whenever SCHEMA_VERSION changes.
 *  v0 (bare array) -> entries only.  v1 { entries } -> prayers = [].  v2 { entries, prayers }. */
export function migrateStore(raw: unknown): Store {
  if (Array.isArray(raw)) return { entries: raw.map((e) => normalize(e)), prayers: [] };
  if (raw && typeof raw === "object" && Array.isArray((raw as Envelope).entries)) {
    const env = raw as Envelope;
    return {
      entries: env.entries.map((e) => normalize(e)),
      prayers: Array.isArray(env.prayers) ? env.prayers.filter((p) => p && typeof p === "object").map((p) => normalizePrayer(p)) : [],
    };
  }
  throw new Error("Unrecognised journal format");
}
export function migrate(raw: unknown): JournalEntry[] { return migrateStore(raw).entries; }

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return { entries: [], prayers: [] };
    try {
      return migrateStore(JSON.parse(raw));
    } catch {
      // Never destroy data we cannot read: keep a copy and start from an empty journal.
      try { localStorage.setItem(JOURNAL_BACKUP_KEY, raw); } catch {}
      return { entries: [], prayers: [] };
    }
  } catch { return { entries: [], prayers: [] }; }
}

/** Write entries and prayers together. A prayer's journal link is dropped if its entry no longer exists. */
export function saveStore(store: Store): boolean {
  try {
    const ids = new Set(store.entries.map((e) => e.id));
    const prayers = store.prayers.map((p) => (p.journalEntryId && !ids.has(p.journalEntryId) ? { ...p, journalEntryId: undefined } : p));
    const env: Envelope = { version: SCHEMA_VERSION, entries: store.entries, prayers };
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(env));
    return true;
  } catch { return false; }
}

export const loadEntries = (): JournalEntry[] => loadStore().entries;
export const loadPrayers = (): SavedPrayer[] => loadStore().prayers;
/** Saves entries while preserving whatever prayers are already stored, so Stage 3 code paths cannot erase them. */
export const saveEntries = (entries: JournalEntry[]): boolean => saveStore({ entries, prayers: loadStore().prayers });
export const savePrayers = (prayers: SavedPrayer[]): boolean => saveStore({ entries: loadStore().entries, prayers });

export function exportJson(entries: JournalEntry[], prayers: SavedPrayer[] = []): string {
  return JSON.stringify({ app: "lamb-of-christ", version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), entries, prayers }, null, 2);
}

export function blankEntry(): JournalEntry {
  return normalize({ source: "free" });
}

/** Create or refresh the journal entry for a lesson, copying the saved Stage 2 reflection answers. */
export function upsertFromLesson(entries: JournalEntry[], lesson: Lesson, answers: string[]): { entries: JournalEntry[]; id: string } {
  const lid = lessonId(lesson.book, lesson.chapter);
  const reflections: Reflection[] = lesson.reflection.map((prompt, i) => ({ prompt, answer: answers[i] ?? "" }));
  const existing = entries.find((e) => e.lessonId === lid);
  const now = new Date().toISOString();
  if (existing) {
    const updated = { ...existing, lessonReflections: reflections, updatedAt: now };
    return { entries: entries.map((e) => (e.id === existing.id ? updated : e)), id: existing.id };
  }
  const entry = normalize({
    source: "lesson", lessonId: lid, bookSlug: lesson.book, chapter: lesson.chapter,
    lessonTitle: lesson.title, ref: `${lesson.ref}`, lessonReflections: reflections,
    tags: lesson.keyIdeas.slice(0, 3).map((t) => t.toLowerCase()),
  });
  return { entries: [entry, ...entries], id: entry.id };
}

export function entryText(e: JournalEntry): string {
  return [
    e.lessonTitle, e.ref, e.bookSlug, e.notes, ...e.tags,
    ...Object.values(e.guided), ...e.lessonReflections.flatMap((r) => [r.prompt, r.answer]),
  ].filter(Boolean).join(" \n ").toLowerCase();
}

export interface Filters { q: string; book: string; tag: string; month: string; favoritesOnly: boolean }
export const NO_FILTERS: Filters = { q: "", book: "", tag: "", month: "", favoritesOnly: false };

export function filterEntries(entries: JournalEntry[], f: Filters): JournalEntry[] {
  const q = f.q.trim().toLowerCase();
  return entries
    .filter((e) => (!q || entryText(e).includes(q)) && (!f.book || e.bookSlug === f.book) &&
      (!f.tag || e.tags.includes(f.tag)) && (!f.month || e.createdAt.slice(0, 7) === f.month) &&
      (!f.favoritesOnly || e.favorite))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function hasContent(e: JournalEntry): boolean {
  return !!(e.notes.trim() || Object.values(e.guided).some((v) => v.trim()) || e.lessonReflections.some((r) => r.answer.trim()));
}
