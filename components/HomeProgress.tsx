"use client";
import { LESSONS, lessonId } from "@/lib/lessons";
import { useProgress } from "@/lib/useProgress";
import { ProgressRing } from "./ProgressRing";

export function HomeProgress() {
  const { state } = useProgress();
  const done = LESSONS.filter((l) => state.completed[lessonId(l.book, l.chapter)]).length;
  return (
    <section className="panel p-4 flex items-center gap-4" aria-label="Journey progress">
      <ProgressRing value={(done / LESSONS.length) * 100} size={56} label="Lessons completed" />
      <div>
        <p className="font-bold">Your journey so far</p>
        <p className="text-sm text-cocoa-soft">{done} of {LESSONS.length} available lessons completed</p>
      </div>
    </section>
  );
}
