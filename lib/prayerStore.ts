import { JournalEntry, SavedPrayer, Store, newId } from "./journal";

export const PRAYER_ENTRY_TITLE = "A prayer for my situation";

/** The Scripture references of a prayer as one string, or undefined when it has none. */
export const refsOf = (p: Pick<SavedPrayer, "scripture">) => (p.scripture.length ? p.scripture.map((s) => s.ref).join("; ") : undefined);

/**
 * Create the journal entry for a prayer, or refresh the existing one. Never duplicates: an entry is matched by the
 * prayer's stored link first, then by an entry that already points back at the prayer.
 * When updating we only refresh the prayer text and references, so anything the user wrote in the journal is kept.
 */
export function upsertPrayerEntry(entries: JournalEntry[], prayer: SavedPrayer): { entries: JournalEntry[]; id: string } {
  const existing = entries.find((e) => e.id === prayer.journalEntryId) ?? entries.find((e) => e.prayerId === prayer.id);
  const now = new Date().toISOString();
  const tags = ["prayer", ...(prayer.emotion ? [prayer.emotion] : [])];
  if (existing) {
    const updated: JournalEntry = {
      ...existing, prayerId: prayer.id, ref: refsOf(prayer), updatedAt: now,
      guided: { ...existing.guided, pray: prayer.text },
      tags: Array.from(new Set([...existing.tags, ...tags])),
    };
    return { entries: entries.map((e) => (e.id === existing.id ? updated : e)), id: existing.id };
  }
  const entry: JournalEntry = {
    id: newId(), createdAt: now, updatedAt: now, source: "prayer", prayerId: prayer.id,
    lessonTitle: PRAYER_ENTRY_TITLE, ref: refsOf(prayer),
    guided: { god: "", self: "", apply: "", pray: prayer.text },
    lessonReflections: [], notes: prayer.situation ? `What I brought to God:\n${prayer.situation}` : "",
    tags, favorite: false, reviews: [],
  };
  return { entries: [entry, ...entries], id: entry.id };
}

export function upsertPrayer(prayers: SavedPrayer[], prayer: SavedPrayer): SavedPrayer[] {
  const stamped = { ...prayer, updatedAt: new Date().toISOString() };
  return prayers.some((p) => p.id === prayer.id) ? prayers.map((p) => (p.id === prayer.id ? stamped : p)) : [stamped, ...prayers];
}

/** Delete a prayer. The linked journal entry is deleted only if asked; otherwise it is kept and simply unlinked. */
export function deletePrayer(store: Store, id: string, alsoDeleteEntry: boolean): Store {
  const prayer = store.prayers.find((p) => p.id === id);
  const entryId = prayer?.journalEntryId;
  const now = new Date().toISOString();
  const entries = alsoDeleteEntry && entryId
    ? store.entries.filter((e) => e.id !== entryId)
    : store.entries.map((e) => (e.prayerId === id ? { ...e, prayerId: undefined, updatedAt: now } : e));
  return { entries, prayers: store.prayers.filter((p) => p.id !== id) };
}

export function deleteAllPrayers(store: Store): Store {
  const now = new Date().toISOString();
  return { entries: store.entries.map((e) => (e.prayerId ? { ...e, prayerId: undefined, updatedAt: now } : e)), prayers: [] };
}
