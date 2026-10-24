"use client";
import { useCallback, useEffect, useState } from "react";
import { JOURNAL_KEY, JournalEntry, Review, loadEntries, saveEntries, upsertFromLesson } from "./journal";
import type { Lesson } from "./lessons";
import { clearDeletionMark, LOCAL_REFRESH_EVENT, recordLocalChange } from "./account/localSync";

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(loadEntries()); setReady(true);
    const on = (e: StorageEvent) => { if (e.key === JOURNAL_KEY) setEntries(loadEntries()); };
    const refresh = () => setEntries(loadEntries());
    window.addEventListener("storage", on);
    window.addEventListener(LOCAL_REFRESH_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener(LOCAL_REFRESH_EVENT, refresh);
    };
  }, []);

  // Always read the latest stored list before writing so two tabs/components never overwrite each other.
  const mutate = useCallback((fn: (list: JournalEntry[]) => JournalEntry[]) => {
    const next = fn(loadEntries());
    const ok = saveEntries(next);
    setEntries(next);
    if (ok) recordLocalChange();
    return ok;
  }, []);

  return {
    entries, ready,
    getEntry: (id: string) => entries.find((e) => e.id === id),
    saveEntry: (entry: JournalEntry) => {
      const saved = mutate((l) => {
      const stamped = { ...entry, updatedAt: new Date().toISOString() };
      return l.some((e) => e.id === entry.id) ? l.map((e) => (e.id === entry.id ? stamped : e)) : [stamped, ...l];
      });
      if (saved) clearDeletionMark("entry", entry.id);
      return saved;
    },
    removeEntry: (id: string) => {
      const removed = mutate((l) => l.filter((e) => e.id !== id));
      if (removed) recordLocalChange({ deletedEntries: [id] });
      return removed;
    },
    removeAll: () => {
      const ids = loadEntries().map((entry) => entry.id);
      const removed = mutate(() => []);
      if (removed && ids.length) recordLocalChange({ deletedEntries: ids });
      return removed;
    },
    toggleFavorite: (id: string) => mutate((l) => l.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e))),
    addReview: (id: string, r: Review) => mutate((l) => l.map((e) => (e.id === id ? { ...e, reviews: [...e.reviews, r] } : e))),
    transferLesson: (lesson: Lesson, answers: string[]) => {
      const { entries: next, id } = upsertFromLesson(loadEntries(), lesson, answers);
      const saved = saveEntries(next);
      setEntries(next);
      if (saved) {
        clearDeletionMark("entry", id);
        recordLocalChange();
      }
      return id;
    },
  };
}
