"use client";
import { useCallback, useEffect, useState } from "react";
import { JOURNAL_KEY, JournalEntry, SavedPrayer, loadStore, saveStore } from "./journal";
import { deleteAllPrayers, deletePrayer, upsertPrayer, upsertPrayerEntry } from "./prayerStore";
import { clearDeletionMark, LOCAL_REFRESH_EVENT, recordLocalChange } from "./account/localSync";

/** Saved prayers, stored in the same versioned envelope as the journal. Every write re-reads storage first. */
export function usePrayers() {
  const [prayers, setPrayers] = useState<SavedPrayer[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => { const s = loadStore(); setPrayers(s.prayers); setEntries(s.entries); }, []);
  useEffect(() => {
    refresh(); setReady(true);
    const on = (e: StorageEvent) => { if (e.key === JOURNAL_KEY) refresh(); };
    const onRefresh = () => refresh();
    window.addEventListener("storage", on);
    window.addEventListener(LOCAL_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener(LOCAL_REFRESH_EVENT, onRefresh);
    };
  }, [refresh]);

  const commit = useCallback((fn: (s: ReturnType<typeof loadStore>) => ReturnType<typeof loadStore>, deletedPrayers: string[] = [], deletedEntries: string[] = []) => {
    const ok = saveStore(fn(loadStore()));
    refresh();
    if (ok) recordLocalChange({ deletedPrayers, deletedEntries });
    return ok;
  }, [refresh]);

  return {
    prayers, entries, ready,
    getPrayer: (id: string) => prayers.find((p) => p.id === id),
    /** Create or update by stable id. Returns false if the browser refused the write. */
    savePrayer: (p: SavedPrayer) => {
      const ok = commit((s) => ({ ...s, prayers: upsertPrayer(s.prayers, p) }));
      if (ok) clearDeletionMark("prayer", p.id);
      return ok;
    },
    /** Save the prayer (if needed) and create/refresh its journal entry in one write. Returns the entry id, or null on failure. */
    saveToJournal: (p: SavedPrayer): string | null => {
      let id: string | null = null;
      const ok = commit((s) => {
        const withPrayer = upsertPrayer(s.prayers, p);
        const saved = withPrayer.find((x) => x.id === p.id)!;
        const r = upsertPrayerEntry(s.entries, saved);
        id = r.id;
        return { entries: r.entries, prayers: withPrayer.map((x) => (x.id === p.id ? { ...x, journalEntryId: r.id } : x)) };
      });
      if (ok) {
        clearDeletionMark("prayer", p.id);
        if (id) clearDeletionMark("entry", id);
      }
      return ok ? id : null;
    },
    removePrayer: (id: string, alsoDeleteEntry = false) => {
      const entryId = prayers.find((prayer) => prayer.id === id)?.journalEntryId;
      return commit((s) => deletePrayer(s, id, alsoDeleteEntry), [id], alsoDeleteEntry && entryId ? [entryId] : []);
    },
    removeAllPrayers: () => commit(deleteAllPrayers, prayers.map((prayer) => prayer.id)),
  };
}
