import { describe, expect, it } from "vitest";
import { mergeAccountSnapshots } from "@/lib/account/localSync";
import { EMPTY_ACCOUNT_SNAPSHOT, type AccountSnapshot } from "@/lib/account/types";
import type { JournalEntry, SavedPrayer } from "@/lib/journal";

const entry = (id: string, updatedAt: string, prayerId?: string): JournalEntry => ({
  id,
  createdAt: updatedAt,
  updatedAt,
  source: prayerId ? "prayer" : "free",
  prayerId,
  guided: { god: "", self: "", apply: "", pray: "" },
  lessonReflections: [],
  notes: id,
  tags: [],
  favorite: false,
  reviews: [],
});

const prayer = (id: string, updatedAt: string, journalEntryId?: string): SavedPrayer => ({
  id,
  createdAt: updatedAt,
  updatedAt,
  situation: "A quiet moment",
  language: "en",
  length: "concise",
  text: "A written prayer",
  origin: "written",
  scripture: [],
  journalEntryId,
});

const snapshot = (patch: Partial<AccountSnapshot>): AccountSnapshot => ({
  ...EMPTY_ACCOUNT_SNAPSHOT,
  ...patch,
});

describe("account snapshot merge", () => {
  it("merges guest and account records by stable ID without creating duplicates", () => {
    const localEntry = entry("entry-1", "2026-01-02T00:00:00.000Z");
    const remoteEntry = entry("entry-1", "2026-01-01T00:00:00.000Z");
    const remotePrayer = prayer("prayer-1", "2026-01-01T00:00:00.000Z");
    const result = mergeAccountSnapshots(
      snapshot({ entries: [localEntry, entry("guest-only", localEntry.updatedAt)] }),
      snapshot({ entries: [remoteEntry], prayers: [remotePrayer] }),
    );

    expect(result.entries).toHaveLength(2);
    expect(result.entries.find((item) => item.id === "entry-1")?.updatedAt).toBe(localEntry.updatedAt);
    expect(result.prayers.map((item) => item.id)).toEqual(["prayer-1"]);
  });

  it("keeps a linked prayer and journal entry reciprocal through sync", () => {
    const linkedEntry = entry("entry-1", "2026-01-02T00:00:00.000Z", "prayer-1");
    const linkedPrayer = prayer("prayer-1", "2026-01-02T00:00:00.000Z", "entry-1");
    const result = mergeAccountSnapshots(
      snapshot({ entries: [linkedEntry], prayers: [linkedPrayer] }),
      EMPTY_ACCOUNT_SNAPSHOT,
    );

    expect(result.entries[0].prayerId).toBe("prayer-1");
    expect(result.prayers[0].journalEntryId).toBe("entry-1");
  });

  it("does not resurrect a deleted record from a stale device snapshot", () => {
    const deletedAt = "2026-01-03T00:00:00.000Z";
    const result = mergeAccountSnapshots(
      snapshot({ entries: [entry("entry-1", "2026-01-01T00:00:00.000Z")] }),
      snapshot({ deletedEntries: [{ id: "entry-1", deletedAt }] }),
    );

    expect(result.entries).toEqual([]);
    expect(result.deletedEntries).toEqual([{ id: "entry-1", deletedAt }]);
  });

  it("retains a deliberate recreation newer than its deletion tombstone", () => {
    const result = mergeAccountSnapshots(
      snapshot({ entries: [entry("entry-1", "2026-01-04T00:00:00.000Z")] }),
      snapshot({ deletedEntries: [{ id: "entry-1", deletedAt: "2026-01-03T00:00:00.000Z" }] }),
    );

    expect(result.entries.map((item) => item.id)).toEqual(["entry-1"]);
  });

  it("prefers the more recently changed lesson progress", () => {
    const local = snapshot({
      progress: { completed: { "genesis-1": true }, answers: {}, level: "beginner" },
      progressUpdatedAt: "2026-01-02T00:00:00.000Z",
    });
    const remote = snapshot({
      progress: { completed: { "genesis-1": false, "psalms-23": true }, answers: {}, level: "intermediate" },
      progressUpdatedAt: "2026-01-03T00:00:00.000Z",
    });

    expect(mergeAccountSnapshots(local, remote).progress).toEqual(remote.progress);
  });

  it("merges independent lesson progress changes made on separate devices", () => {
    const local = snapshot({
      progress: { completed: { "genesis-1": true }, answers: { "genesis-1": ["Reflection"] }, level: "beginner" },
      progressUpdatedAt: "2026-01-02T00:00:00.000Z",
      progressVersions: {
        "completed:genesis-1": "2026-01-02T00:00:00.000Z",
        "answers:genesis-1": "2026-01-02T00:00:00.000Z",
      },
    });
    const remote = snapshot({
      progress: { completed: { "psalms-23": true }, answers: { "psalms-23": ["Comfort"] }, level: "beginner" },
      progressUpdatedAt: "2026-01-03T00:00:00.000Z",
      progressVersions: {
        "completed:psalms-23": "2026-01-03T00:00:00.000Z",
        "answers:psalms-23": "2026-01-03T00:00:00.000Z",
      },
    });

    const result = mergeAccountSnapshots(local, remote);
    expect(result.progress.completed).toEqual({ "genesis-1": true, "psalms-23": true });
    expect(result.progress.answers).toEqual({ "genesis-1": ["Reflection"], "psalms-23": ["Comfort"] });
  });

  it("drops broken links instead of syncing one-sided relationships", () => {
    const result = mergeAccountSnapshots(
      snapshot({ entries: [entry("entry-1", "2026-01-02T00:00:00.000Z", "missing-prayer")] }),
      EMPTY_ACCOUNT_SNAPSHOT,
    );

    expect(result.entries[0].prayerId).toBeUndefined();
  });
});
