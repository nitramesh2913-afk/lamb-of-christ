"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BOOKS } from "@/lib/books";
import { Filters, JournalEntry, NO_FILTERS, entryText, exportJson, filterEntries, loadPrayers } from "@/lib/journal";
import { useJournal } from "@/lib/useJournal";
import { useAccount } from "./AccountProvider";

function snippet(e: JournalEntry) {
  const parts = [...Object.values(e.guided), e.notes, ...e.lessonReflections.map((r) => r.answer)].filter((s) => s.trim());
  const t = parts[0] ?? "No words written yet.";
  return t.length > 140 ? t.slice(0, 140) + "…" : t;
}

export function JournalHistory() {
  const { entries, ready, toggleFavorite, removeEntry, removeAll } = useJournal();
  const { user } = useAccount();
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const shown = useMemo(() => filterEntries(entries, f), [entries, f]);
  const tags = useMemo(() => Array.from(new Set(entries.flatMap((e) => e.tags))).sort(), [entries]);
  const months = useMemo(() => Array.from(new Set(entries.map((e) => e.createdAt.slice(0, 7)))).sort().reverse(), [entries]);
  const groups = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    shown.forEach((e) => { const d = e.createdAt.slice(0, 10); m.set(d, [...(m.get(d) ?? []), e]); });
    return Array.from(m.entries());
  }, [shown]);
  const filtered = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson(entries, loadPrayers())], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "my-walk-with-god.json"; a.click(); URL.revokeObjectURL(url);
  };

  if (!ready) return <p role="status">Loading your journal…</p>;

  return (
    <section className="space-y-5 animate-fadeUp">
      <div>
        <h1 className="font-display text-3xl font-extrabold">My Walk with God</h1>
        <p className="text-cocoa-soft">{user ? "Private to your account and synced across your devices." : "Private by default. Your entries stay on this device until you sign in to sync them."}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/journal/edit?id=new" className="btn">New entry</Link>
        <Link href="/journal/review" className="btn-ghost">Remember what I learned</Link>
      </div>

      {entries.length === 0 ? (
        <div className="panel p-6 space-y-3" data-testid="empty-journal">
          <h2 className="font-display text-xl font-extrabold">Your journal is waiting</h2>
          <p className="text-cocoa-soft">Finish a Bible lesson and save your reflections here, or start a free entry whenever you like.</p>
          <Link href="/bible" className="btn">Find a lesson</Link>
        </div>
      ) : (
        <>
          <div className="panel p-4 grid gap-3 sm:grid-cols-2" role="search">
            <input type="search" aria-label="Search my journal" placeholder="Search words, verses, topics…" value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })} className="min-h-[48px] rounded-full border border-gold/30 bg-white/70 px-4 sm:col-span-2" />
            <select aria-label="Filter by Bible book" value={f.book} onChange={(e) => setF({ ...f, book: e.target.value })} className="min-h-[48px] rounded-full border border-gold/30 bg-white/70 px-3">
              <option value="">All books</option>
              {BOOKS.map((b) => <option key={b.slug} value={b.slug}>{b.title}</option>)}
            </select>
            <select aria-label="Filter by topic" value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} className="min-h-[48px] rounded-full border border-gold/30 bg-white/70 px-3">
              <option value="">All topics</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Filter by month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} className="min-h-[48px] rounded-full border border-gold/30 bg-white/70 px-3">
              <option value="">Any date</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="flex items-center gap-2 min-h-[48px] font-bold">
              <input type="checkbox" checked={f.favoritesOnly} onChange={(e) => setF({ ...f, favoritesOnly: e.target.checked })} className="w-5 h-5" /> Favorites only
            </label>
          </div>

          {shown.length === 0 ? (
            <div className="panel p-5 space-y-3" data-testid="no-matches">
              <p>No entries match those filters.</p>
              {filtered && <button type="button" className="btn-ghost" onClick={() => setF(NO_FILTERS)}>Clear filters</button>}
            </div>
          ) : groups.map(([day, list]) => (
            <div key={day} className="space-y-3">
              <h2 className="font-display font-extrabold text-cocoa-soft">{new Date(day + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
              {list.map((e) => (
                <article key={e.id} className="panel p-4 space-y-2" aria-label={e.lessonTitle ?? "Free reflection"}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-extrabold">{e.lessonTitle ?? "Free reflection"}{e.source === "prayer" && <span className="chip bg-cream-deep text-cocoa ml-2 align-middle">Prayer</span>}</h3>
                      {e.ref && <p className="text-xs font-bold text-gold">{e.ref}</p>}
                    </div>
                    <button type="button" aria-pressed={e.favorite} aria-label={e.favorite ? "Remove from favorites" : "Add to favorites"}
                      onClick={() => toggleFavorite(e.id)} className="w-11 h-11 rounded-full text-xl bg-cream-deep">{e.favorite ? "★" : "☆"}</button>
                  </div>
                  <p className="text-cocoa-soft">{snippet(e)}</p>
                  {e.tags.length > 0 && <div className="flex flex-wrap gap-2">{e.tags.map((t) => <span key={t} className="chip bg-sage-light text-sage-dark">{t}</span>)}</div>}
                  <div className="flex flex-wrap gap-2 items-center">
                    <Link href={`/journal/edit?id=${e.id}`} className="btn-ghost">Open &amp; edit</Link>
                    {pendingDelete !== e.id ? (
                      <button type="button" className="btn-ghost" onClick={() => setPendingDelete(e.id)}>Delete</button>
                    ) : (
                      <span className="flex items-center gap-2" role="alertdialog" aria-label="Confirm delete">
                        <span className="font-bold">Delete for good?</span>
                        <button type="button" className="btn" onClick={() => { removeEntry(e.id); setPendingDelete(null); }}>Yes, delete</button>
                        <button type="button" className="btn-ghost" onClick={() => setPendingDelete(null)}>Keep it</button>
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ))}

          <div className="panel p-4 space-y-3">
            <h2 className="font-display font-extrabold">Your data</h2>
            <p className="text-sm text-cocoa-soft">{user ? "Your entries and saved prayers are synced to your private account. Download a copy any time." : "Entries are saved in this browser. Create an account to migrate and sync your data across devices."}</p>
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" className="btn-ghost" onClick={download}>Download my journal</button>
              {!confirmAll ? <button type="button" className="btn-ghost" onClick={() => setConfirmAll(true)}>Delete all entries</button> : (
                <span className="flex items-center gap-2" role="alertdialog" aria-label="Confirm delete all">
                  <span className="font-bold">Delete all {entries.length} entries for good?</span>
                  <button type="button" className="btn" onClick={() => { removeAll(); setConfirmAll(false); }}>Yes, delete all</button>
                  <button type="button" className="btn-ghost" onClick={() => setConfirmAll(false)}>Keep them</button>
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
// entryText is re-exported for tests of search behaviour
export { entryText };
