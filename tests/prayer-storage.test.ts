import { describe, expect, it } from "vitest";
import {
  JOURNAL_BACKUP_KEY, JOURNAL_KEY, SCHEMA_VERSION, JournalEntry, SavedPrayer, blankEntry, exportJson, loadEntries, loadPrayers,
  loadStore, migrate, migrateStore, normalizePrayer, saveEntries, savePrayers, saveStore,
} from "@/lib/journal";
import { deleteAllPrayers, deletePrayer, upsertPrayer, upsertPrayerEntry } from "@/lib/prayerStore";
import { getPassage, toScriptureItem } from "@/lib/prayer/bible";

const scripture = [toScriptureItem(getPassage("phil-4-6-7")!), toScriptureItem(getPassage("1pet-5-7")!)];
const prayer = (over: Partial<SavedPrayer> = {}): SavedPrayer => normalizePrayer({
  id: "p1", createdAt: "2026-10-01T10:00:00.000Z", situation: "Worried about exams", emotion: "anxious", language: "en", length: "concise",
  text: "Father, steady my heart. Amen.", origin: "ai", scripture, ...over,
});
const raw = () => JSON.parse(localStorage.getItem(JOURNAL_KEY)!);
const V1_ENTRY = { id: "old-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", source: "lesson", lessonId: "genesis-1", bookSlug: "genesis", chapter: 1,
  lessonTitle: "In the Beginning", ref: "Genesis 1:1–5", guided: { god: "He creates", self: "", apply: "", pray: "" }, lessonReflections: [], notes: "keep me", tags: ["creation"], favorite: true, reviews: [] };

describe("schema v2 migration", () => {
  it("is version 2 and keeps the original storage key (so no one's data is orphaned)", () => {
    expect(SCHEMA_VERSION).toBe(2);
    expect(JOURNAL_KEY).toBe("loc.journal.v1");
  });
  it("loads a v1 envelope untouched and gives it an empty prayers list", () => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ version: 1, entries: [V1_ENTRY] }));
    const s = loadStore();
    expect(s.prayers).toEqual([]);
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0]).toMatchObject({ id: "old-1", notes: "keep me", favorite: true, tags: ["creation"], lessonId: "genesis-1", source: "lesson" });
  });
  it("does not rewrite stored data just by reading it", () => {
    const original = JSON.stringify({ version: 1, entries: [V1_ENTRY] });
    localStorage.setItem(JOURNAL_KEY, original);
    loadStore(); loadEntries(); loadPrayers();
    expect(localStorage.getItem(JOURNAL_KEY)).toBe(original);
  });
  it("upgrades to v2 on the next save, preserving every v1 entry exactly", () => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ version: 1, entries: [V1_ENTRY] }));
    savePrayers([prayer()]);
    const r = raw();
    expect(r.version).toBe(2);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0]).toMatchObject({ id: "old-1", notes: "keep me", lessonTitle: "In the Beginning" });
    expect(r.prayers).toHaveLength(1);
  });
  it("still migrates the legacy bare-array format", () => {
    expect(migrate([{ id: "a" }])[0].id).toBe("a");
    expect(migrateStore([{ id: "a" }]).prayers).toEqual([]);
  });
  it("rejects unrecognised shapes by keeping a backup and not crashing (existing behaviour)", () => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ hello: "world" }));
    expect(loadStore()).toEqual({ entries: [], prayers: [] });
    expect(localStorage.getItem(JOURNAL_BACKUP_KEY)).toContain("hello");
  });
  it("normalises malformed prayers instead of crashing, and drops invalid scripture", () => {
    const p = normalizePrayer({ id: "x", emotion: "furious" as never, language: "fr" as never, length: "epic" as never, origin: "??" as never, scripture: [{ nope: 1 } as never, scripture[0]] });
    expect(p).toMatchObject({ id: "x", emotion: undefined, language: "en", length: "concise", origin: "written" });
    expect(p.scripture).toHaveLength(1);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ version: 2, entries: [], prayers: [null, 5, { id: "ok", text: "hi" }] }));
    expect(loadPrayers().map((x) => x.id)).toEqual(["ok"]);
  });
});

describe("Stage 3 code paths cannot erase prayers (and vice versa)", () => {
  it("saveEntries keeps stored prayers", () => {
    saveStore({ entries: [], prayers: [prayer()] });
    saveEntries([blankEntry()]);
    expect(loadPrayers()).toHaveLength(1);
    expect(loadEntries()).toHaveLength(1);
  });
  it("savePrayers keeps stored entries", () => {
    saveEntries([blankEntry()]);
    savePrayers([prayer()]);
    expect(loadEntries()).toHaveLength(1);
  });
  it("removing a journal entry clears a dangling link on its prayer but keeps the prayer", () => {
    const entry = blankEntry();
    saveStore({ entries: [entry], prayers: [prayer({ journalEntryId: entry.id })] });
    expect(loadPrayers()[0].journalEntryId).toBe(entry.id);
    saveEntries([]);
    expect(loadPrayers()).toHaveLength(1);
    expect(loadPrayers()[0].journalEntryId).toBeUndefined();
  });
  it("reports failure instead of throwing when storage is full", () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error("quota"); };
    try { expect(saveStore({ entries: [], prayers: [prayer()] })).toBe(false); } finally { Storage.prototype.setItem = orig; }
  });
});

describe("saved prayers", () => {
  it("round-trips with a stable id, timestamps and optional Scripture references", () => {
    savePrayers(upsertPrayer([], prayer()));
    const [p] = loadPrayers();
    expect(p.id).toBe("p1");
    expect(p.createdAt).toBe("2026-10-01T10:00:00.000Z");
    expect(Date.parse(p.updatedAt)).toBeGreaterThan(Date.parse(p.createdAt));
    expect(p.scripture.map((s) => s.ref)).toEqual(["Philippians 4:6–7", "1 Peter 5:7"]);
    expect(p.scripture[0].quote).toBe(getPassage("phil-4-6-7")!.verses.map((v) => v.text).join(" "));
    savePrayers(upsertPrayer(loadPrayers(), prayer({ id: "p2", scripture: [] })));
    expect(loadPrayers().find((x) => x.id === "p2")!.scripture).toEqual([]);
  });
  it("editing updates in place: same id, same createdAt, no duplicates", () => {
    savePrayers(upsertPrayer([], prayer()));
    const before = loadPrayers()[0];
    savePrayers(upsertPrayer(loadPrayers(), { ...before, text: "Edited prayer text.", origin: "edited" }));
    const all = loadPrayers();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: "p1", text: "Edited prayer text.", origin: "edited", createdAt: before.createdAt });
  });
});

describe("journal integration", () => {
  const existing = () => normalizeEntry(V1_ENTRY);
  function normalizeEntry(e: unknown): JournalEntry { return migrate([e])[0]; }

  it("creates one linked entry with the prayer text, references and situation", () => {
    const { entries, id } = upsertPrayerEntry([existing()], prayer());
    expect(entries).toHaveLength(2);
    const e = entries.find((x) => x.id === id)!;
    expect(e).toMatchObject({ source: "prayer", prayerId: "p1", ref: "Philippians 4:6–7; 1 Peter 5:7" });
    expect(e.guided.pray).toBe("Father, steady my heart. Amen.");
    expect(e.notes).toContain("Worried about exams");
    expect(e.tags).toEqual(["prayer", "anxious"]);
    expect(e.id).toMatch(/\S{8,}/);
  });
  it("leaves existing entries completely untouched", () => {
    const before = existing();
    const { entries } = upsertPrayerEntry([before], prayer());
    expect(entries.find((e) => e.id === "old-1")).toEqual(before);
  });
  it("does not duplicate: a second save refreshes the same entry and keeps the user's own journal notes", () => {
    const first = upsertPrayerEntry([], prayer());
    const user = first.entries.map((e) => ({ ...e, notes: "my own thoughts", tags: [...e.tags, "mine"] }));
    const second = upsertPrayerEntry(user, prayer({ journalEntryId: first.id, text: "Changed prayer.", scripture: [] }));
    expect(second.entries).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(second.entries[0]).toMatchObject({ notes: "my own thoughts", ref: undefined });
    expect(second.entries[0].guided.pray).toBe("Changed prayer.");
    expect(second.entries[0].tags).toEqual(expect.arrayContaining(["prayer", "anxious", "mine"]));
  });
  it("re-links to an entry that already points at the prayer instead of creating another", () => {
    const first = upsertPrayerEntry([], prayer());
    const again = upsertPrayerEntry(first.entries, prayer({ journalEntryId: undefined }));
    expect(again.entries).toHaveLength(1);
    expect(again.id).toBe(first.id);
  });
  it("creates a fresh entry if the linked one was deleted", () => {
    const again = upsertPrayerEntry([], prayer({ journalEntryId: "gone" }));
    expect(again.entries).toHaveLength(1);
    expect(again.id).not.toBe("gone");
  });
});

describe("deletion and export controls", () => {
  const linked = () => {
    const { entries, id } = upsertPrayerEntry([], prayer());
    return { entries, prayers: [prayer({ journalEntryId: id }), prayer({ id: "p2" })] };
  };
  it("deleting a prayer only keeps the journal entry (unlinked)", () => {
    const s = deletePrayer(linked(), "p1", false);
    expect(s.prayers.map((p) => p.id)).toEqual(["p2"]);
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].prayerId).toBeUndefined();
  });
  it("deleting a prayer can also delete its journal entry", () => {
    const s = deletePrayer(linked(), "p1", true);
    expect(s.entries).toHaveLength(0);
    expect(s.prayers.map((p) => p.id)).toEqual(["p2"]);
  });
  it("delete-all removes prayers but never journal entries", () => {
    const s = deleteAllPrayers(linked());
    expect(s.prayers).toEqual([]);
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].prayerId).toBeUndefined();
  });
  it("export includes both entries and prayers in the same shape Stage 5 will import", () => {
    const s = linked();
    const out = JSON.parse(exportJson(s.entries, s.prayers));
    expect(out).toMatchObject({ app: "lamb-of-christ", version: 2 });
    expect(out.entries).toHaveLength(1);
    expect(out.prayers.map((p: SavedPrayer) => p.id)).toEqual(["p1", "p2"]);
    expect(out.prayers[0].journalEntryId).toBe(out.entries[0].id);
    expect(JSON.parse(exportJson(s.entries)).prayers).toEqual([]); // old call signature still works
  });
});
