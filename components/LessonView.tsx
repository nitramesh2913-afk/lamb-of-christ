"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lesson, Level, lessonId } from "@/lib/lessons";
import { useProgress } from "@/lib/useProgress";
import { useJournal } from "@/lib/useJournal";
import { useAccount } from "./AccountProvider";

const LEVELS: { id: Level; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "indepth", label: "In-depth" },
];

function Quiz({ lesson }: { lesson: Lesson }) {
  const [picked, setPicked] = useState<(number | null)[]>(lesson.quiz.map(() => null));
  const score = picked.filter((p, i) => p === lesson.quiz[i].answer).length;
  const all = picked.every((p) => p !== null);
  return (
    <div className="space-y-4">
      {lesson.quiz.map((q, qi) => (
        <fieldset key={qi} className="space-y-2">
          <legend className="font-bold">{qi + 1}. {q.q}</legend>
          {q.options.map((o, oi) => {
            const chosen = picked[qi] === oi;
            const answered = picked[qi] !== null;
            const right = oi === q.answer;
            return (
              <button key={oi} type="button" disabled={answered}
                onClick={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))}
                className={`w-full text-left min-h-[48px] px-4 rounded-2xl border-2 font-semibold transition ${
                  answered && right ? "border-sage bg-sage-light" : answered && chosen ? "border-gold bg-cream-deep" : "border-gold/30 bg-ivory hover:bg-cream-deep"}`}>
                {o}{answered && right ? " ✓" : ""}
              </button>
            );
          })}
          {picked[qi] !== null && (
            <p role="status" className="text-sm text-cocoa-soft"><strong>{picked[qi] === q.answer ? "Well done. " : "Not quite. "}</strong>{q.why}</p>
          )}
        </fieldset>
      ))}
      {all && <p role="status" className="font-bold text-sage-dark">You got {score} of {lesson.quiz.length}. Every answer above is explained, so you can review any time.</p>}
    </div>
  );
}

export function LessonView({ lesson, nextHref }: { lesson: Lesson; nextHref: string | null }) {
  const id = lessonId(lesson.book, lesson.chapter);
  const { state, ready, isDone, setDone, setAnswer, setLevel } = useProgress();
  const done = isDone(id);
  const level = state.level;
  const [showPrayer, setShowPrayer] = useState(false);
  const router = useRouter();
  const journal = useJournal();
  const { user } = useAccount();
  const hasEntry = journal.entries.some((e) => e.lessonId === id);
  const answers = state.answers[id] ?? [];

  return (
    <article className="space-y-5 animate-fadeUp">
      <Link href={`/bible/${lesson.book}`} className="text-sm font-bold text-sage-dark">← Back to chapters</Link>
      <header>
        <p className="text-xs font-extrabold tracking-wide text-gold uppercase">{lesson.ref} · {lesson.translation}</p>
        <h1 className="font-display text-3xl font-extrabold">{lesson.title}</h1>
      </header>

      <section className="panel p-5" aria-label="Scripture">
        <p className="chip bg-sage-light text-sage-dark mb-3">Scripture ({lesson.translation}, public domain)</p>
        <div className="font-display text-lg leading-relaxed space-y-2">
          {lesson.verses.map((v) => (<p key={v.n}><sup className="text-gold font-extrabold mr-1">{v.n}</sup>{v.text}</p>))}
        </div>
      </section>

      <section className="panel p-5 space-y-3" aria-label="Explanation">
        <div role="group" aria-label="Reading level" className="flex gap-2 flex-wrap">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => setLevel(l.id)}
              className={`min-h-[44px] px-4 rounded-full font-bold border-2 ${level === l.id ? "bg-sage text-white border-sage" : "bg-ivory border-gold/30"}`}>{l.label}</button>
          ))}
        </div>
        <p className="chip bg-cream-deep text-cocoa-soft">Commentary — AI-assisted sample, not Scripture</p>
        <p>{lesson.explanation[level]}</p>
        <h2 className="font-display font-extrabold pt-2">Background</h2>
        <p>{lesson.context}</p>
        <h2 className="font-display font-extrabold pt-2">Key ideas</h2>
        <div className="flex flex-wrap gap-2">{lesson.keyIdeas.map((k) => <span key={k} className="chip bg-sage-light text-sage-dark">{k}</span>)}</div>
        <h2 className="font-display font-extrabold pt-2">What this passage teaches</h2>
        <p>{lesson.teaches}</p>
      </section>

      <section className="panel p-5 space-y-3" aria-label="Reflection">
        <h2 className="font-display text-xl font-extrabold">Reflect</h2>
        <p className="text-sm text-cocoa-soft">{user ? "Your answers sync privately to your account." : "Your answers stay private on this device until you sign in to sync them."}</p>
        {lesson.reflection.map((q, i) => (
          <label key={i} className="block">
            <span className="font-semibold">{q}</span>
            <textarea rows={3} value={answers[i] ?? ""} onChange={(e) => setAnswer(id, i, e.target.value)}
              className="mt-1 w-full rounded-2xl border border-gold/30 bg-white/70 p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-dark" />
          </label>
        ))}
      </section>

      <section className="panel p-5 space-y-2" aria-label="Meditation">
        <h2 className="font-display text-xl font-extrabold">Meditate</h2>
        <p>{lesson.meditation}</p>
      </section>

      <section className="panel p-5 space-y-3" aria-label="Quiz">
        <h2 className="font-display text-xl font-extrabold">Check your understanding</h2>
        <Quiz lesson={lesson} />
      </section>

      <section className="panel p-5 space-y-3" aria-label="Closing prayer">
        <h2 className="font-display text-xl font-extrabold">Closing prayer (optional)</h2>
        {showPrayer ? (<><p className="chip bg-cream-deep text-cocoa-soft">Written prayer, not a message from God</p><p className="italic">{lesson.prayer}</p></>)
          : <button type="button" className="btn-ghost" onClick={() => setShowPrayer(true)}>Show a closing prayer</button>}
      </section>

      {done && (
        <section className="panel p-5 space-y-3" aria-label="Save to journal">
          <h2 className="font-display text-xl font-extrabold">Keep what you learned</h2>
          <p className="text-cocoa-soft">Save your reflections to My Walk with God with this passage attached. Nothing needs to be typed twice.</p>
          {!(answers ?? []).some((a) => a && a.trim()) && <p className="text-sm text-cocoa-soft">You haven&rsquo;t written any reflections yet. You can still save the entry and add words in your journal.</p>}
          <button type="button" className="btn" onClick={() => { const eid = journal.transferLesson(lesson, answers); router.push(`/journal/edit?id=${eid}`); }}>
            {hasEntry ? "Update my journal entry" : "Save to my journal"}
          </button>
        </section>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <button type="button" className={done ? "btn-ghost" : "btn"} disabled={!ready} aria-pressed={done}
          onClick={() => setDone(id, !done)}>
          {done ? "✓ Completed — tap to undo" : "Mark lesson complete"}
        </button>
        {done && <p role="status" className="font-bold text-sage-dark">Well walked. One step closer.</p>}
        {done && nextHref && <Link href={nextHref} className="btn">Next lesson →</Link>}
      </div>
    </article>
  );
}
