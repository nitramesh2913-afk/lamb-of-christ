"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GUIDED_PROMPTS, JournalEntry, blankEntry, loadPrayers } from "@/lib/journal";
import { useJournal } from "@/lib/useJournal";
import { useAccount } from "./AccountProvider";

export function JournalEditor({ id }: { id: string }) {
  const router = useRouter();
  const { ready, getEntry, saveEntry, removeEntry } = useJournal();
  const { user } = useAccount();
  const isNew = id === "new";
  const [draft, setDraft] = useState<JournalEntry | null>(null);
  const [tagText, setTagText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!ready || draft) return;
    if (isNew) setDraft(blankEntry());
    else { const e = getEntry(id); if (e) setDraft(e); }
  }, [ready, draft, isNew, id, getEntry]);

  if (!ready) return <p role="status">Loading your journal…</p>;
  if (!draft) {
    return (
      <section className="panel p-5 space-y-3">
        <h1 className="font-display text-2xl font-extrabold">Entry not found</h1>
        <p className="text-cocoa-soft">This entry may have been deleted, or it was saved on another device.</p>
        <Link href="/journal" className="btn">Back to my journal</Link>
      </section>
    );
  }

  const set = (patch: Partial<JournalEntry>) => { setDraft({ ...draft, ...patch }); setSaved(false); };
  const addTag = () => {
    const t = tagText.trim().toLowerCase();
    if (t && !draft.tags.includes(t)) set({ tags: [...draft.tags, t] });
    setTagText("");
  };

  const save = () => {
    setError("");
    if (!saveEntry(draft)) { setError("We couldn't save this on your device. Your browser storage may be full or blocked."); return; }
    setSaved(true);
    if (isNew) router.replace(`/journal/edit?id=${draft.id}`);
  };

  return (
    <article className="space-y-5 animate-fadeUp">
      <Link href="/journal" className="text-sm font-bold text-sage-dark">← My journal</Link>
      <header>
        <p className="text-xs font-extrabold tracking-wide text-gold uppercase">
          {draft.ref ?? "Free reflection"}
        </p>
        <h1 className="font-display text-3xl font-extrabold">{draft.lessonTitle ?? (isNew ? "New entry" : "Journal entry")}</h1>
        {draft.prayerId && loadPrayers().some((p) => p.id === draft.prayerId) && (
          <Link href={`/pray?id=${draft.prayerId}`} className="text-sm font-bold text-sage-dark">View this prayer</Link>
        )}
        {draft.lessonId && draft.bookSlug && (
          <Link href={`/bible/${draft.bookSlug}/${draft.chapter}`} className="text-sm font-bold text-sage-dark">Re-read this passage</Link>
        )}
      </header>

      {draft.lessonReflections.length > 0 && (
        <section className="panel p-5 space-y-3" aria-label="Lesson reflections">
          <h2 className="font-display text-xl font-extrabold">From your lesson</h2>
          <p className="text-sm text-cocoa-soft">Carried over from your answers, so you don&rsquo;t need to write them again.</p>
          {draft.lessonReflections.map((r, i) => (
            <label key={i} className="block">
              <span className="font-semibold">{r.prompt}</span>
              <textarea rows={3} value={r.answer}
                onChange={(e) => set({ lessonReflections: draft.lessonReflections.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })}
                className="mt-1 w-full rounded-2xl border border-gold/30 bg-white/70 p-3" />
            </label>
          ))}
        </section>
      )}

      <section className="panel p-5 space-y-3" aria-label="Guided reflection">
        <h2 className="font-display text-xl font-extrabold">My walk today</h2>
        {GUIDED_PROMPTS.map((p) => (
          <label key={p.key} className="block">
            <span className="font-semibold">{p.label}</span>
            <textarea rows={3} value={draft.guided[p.key]}
              onChange={(e) => set({ guided: { ...draft.guided, [p.key]: e.target.value } })}
              className="mt-1 w-full rounded-2xl border border-gold/30 bg-white/70 p-3" />
          </label>
        ))}
        <label className="block">
          <span className="font-semibold">Anything else on my heart</span>
          <textarea rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-gold/30 bg-white/70 p-3" />
        </label>
      </section>

      <section className="panel p-5 space-y-3" aria-label="Topics">
        <h2 className="font-display text-xl font-extrabold">Topics</h2>
        <div className="flex flex-wrap gap-2">
          {draft.tags.length === 0 && <p className="text-sm text-cocoa-soft">No topics yet.</p>}
          {draft.tags.map((t) => (
            <span key={t} className="chip bg-sage-light text-sage-dark gap-2">
              {t}
              <button type="button" aria-label={`Remove topic ${t}`} onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input aria-label="Add a topic" value={tagText} onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            className="flex-1 min-h-[48px] rounded-full border border-gold/30 bg-white/70 px-4" placeholder="e.g. trust" />
          <button type="button" className="btn-ghost" onClick={addTag}>Add topic</button>
        </div>
      </section>

      {error && <p role="alert" className="panel p-4 text-cocoa border-gold">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn" onClick={save}>Save entry</button>
        {saved && <p role="status" className="font-bold text-sage-dark">{user ? "Saved locally and queued to sync to your account." : "Saved privately on this device."}</p>}
        {!isNew && !confirmDelete && <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(true)}>Delete entry</button>}
        {!isNew && confirmDelete && (
          <span className="flex items-center gap-2" role="alertdialog" aria-label="Confirm delete">
            <span className="font-bold">Delete this entry for good?</span>
            <button type="button" className="btn" onClick={() => { removeEntry(draft.id); router.push("/journal"); }}>Yes, delete</button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>Keep it</button>
          </span>
        )}
      </div>
    </article>
  );
}
