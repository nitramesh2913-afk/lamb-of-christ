"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { JournalEntry, hasContent } from "@/lib/journal";
import { getLesson } from "@/lib/lessons";
import { useJournal } from "@/lib/useJournal";

function written(e: JournalEntry) {
  return [...e.lessonReflections.map((r) => ({ q: r.prompt, a: r.answer })),
    ...Object.entries(e.guided).map(([k, a]) => ({ q: k, a }))].filter((x) => x.a.trim());
}

function ReviewCard({ entry, onDone }: { entry: JournalEntry; onDone: (id: string, correct: boolean | null) => void }) {
  const lesson = entry.lessonId ? getLesson(entry.bookSlug ?? "", entry.chapter ?? 0) : undefined;
  // Fixed when the card first appears, so recording the review doesn't swap the question mid-answer.
  const [q] = useState(() => (lesson ? lesson.quiz[entry.reviews.length % lesson.quiz.length] : undefined));
  const [picked, setPicked] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const mine = written(entry)[0];

  return (
    <article className="panel p-5 space-y-3" aria-label={`Review ${entry.lessonTitle ?? "free reflection"}`}>
      <div>
        <h2 className="font-display text-xl font-extrabold">{entry.lessonTitle ?? "Free reflection"}</h2>
        {entry.ref && <p className="text-xs font-bold text-gold">{entry.ref}</p>}
      </div>
      {mine ? <blockquote className="border-l-4 border-sage pl-3"><p className="text-sm text-cocoa-soft">You wrote:</p><p>{mine.a}</p></blockquote>
        : <p className="text-sm text-cocoa-soft">You haven&rsquo;t written words for this entry yet.</p>}
      {q ? (
        <fieldset className="space-y-2">
          <legend className="font-bold">{q.q}</legend>
          {q.options.map((o, i) => (
            <button key={i} type="button" disabled={picked !== null} onClick={() => { setPicked(i); setDone(true); onDone(entry.id, i === q.answer); }}
              className={`w-full text-left min-h-[48px] px-4 rounded-2xl border-2 font-semibold ${picked !== null && i === q.answer ? "border-sage bg-sage-light" : picked === i ? "border-gold bg-cream-deep" : "border-gold/30 bg-ivory"}`}>{o}{picked !== null && i === q.answer ? " ✓" : ""}</button>
          ))}
          {picked !== null && <p role="status" className="text-sm"><strong>{picked === q.answer ? "Well done. " : "Not quite. "}</strong>{q.why}</p>}
        </fieldset>
      ) : (
        <div className="space-y-2">
          <label className="block"><span className="font-bold">Does this still ring true for you today?</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} disabled={done} className="mt-1 w-full rounded-2xl border border-gold/30 bg-white/70 p-3" /></label>
          {!done ? <button type="button" className="btn" onClick={() => { setDone(true); onDone(entry.id, null); }}>Done reviewing</button> : <p role="status" className="font-bold text-sage-dark">Reviewed.</p>}
        </div>
      )}
    </article>
  );
}

export function ReviewView() {
  const { entries, ready, addReview } = useJournal();
  // Pick once per visit: never-reviewed first, then the least recently reviewed.
  const [picked] = useState<{ ids: string[] | null }>({ ids: null });
  const queue = useMemo(() => {
    if (!ready) return [];
    if (!picked.ids) {
      const last = (e: JournalEntry) => (e.reviews.length ? e.reviews[e.reviews.length - 1].at : "");
      picked.ids = [...entries].filter(hasContent).sort((a, b) => last(a).localeCompare(last(b)) || a.createdAt.localeCompare(b.createdAt)).slice(0, 5).map((e) => e.id);
    }
    return picked.ids.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as JournalEntry[];
  }, [ready, entries, picked]);
  const [reviewed, setReviewed] = useState(0);

  if (!ready) return <p role="status">Loading…</p>;
  return (
    <section className="space-y-5 animate-fadeUp">
      <Link href="/journal" className="text-sm font-bold text-sage-dark">← My journal</Link>
      <h1 className="font-display text-3xl font-extrabold">Remember what I learned</h1>
      {queue.length === 0 ? (
        <div className="panel p-5 space-y-3" data-testid="empty-review">
          <p>Nothing to review yet. Save a lesson reflection to your journal first, and it will appear here.</p>
          <Link href="/bible" className="btn">Find a lesson</Link>
        </div>
      ) : (
        <>
          <p className="text-cocoa-soft">Revisit what you wrote, then answer a quick question. No scores are kept against you.</p>
          {queue.map((e) => <ReviewCard key={e.id} entry={e} onDone={(id, ok) => { addReview(id, { at: new Date().toISOString(), correct: ok }); setReviewed((n) => n + 1); }} />)}
          {reviewed === queue.length && <p role="status" className="panel p-4 font-bold text-sage-dark">All reviewed. Well walked.</p>}
        </>
      )}
    </section>
  );
}
