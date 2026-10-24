"use client";
import Link from "next/link";
import { Book } from "@/lib/books";
import { getLesson, lessonId } from "@/lib/lessons";
import { useProgress } from "@/lib/useProgress";

export function ChapterGrid({ book }: { book: Book }) {
  const { isDone } = useProgress();
  return (
    <ol className="grid grid-cols-5 sm:grid-cols-8 gap-2">
      {Array.from({ length: book.chapters }, (_, i) => {
        const ch = i + 1;
        const lesson = getLesson(book.slug, ch);
        const done = isDone(lessonId(book.slug, ch));
        if (!lesson) {
          return (
            <li key={ch} aria-label={`Chapter ${ch}, lesson not yet available`}
              className="grid place-items-center h-11 rounded-2xl text-sm font-bold bg-cream-deep/60 text-cocoa-soft/60">{ch}</li>
          );
        }
        return (
          <li key={ch}>
            <Link href={`/bible/${book.slug}/${ch}`} aria-label={`Chapter ${ch}: ${lesson.title}${done ? ", completed" : ""}`}
              className={`grid place-items-center h-11 rounded-2xl text-sm font-extrabold border-2 transition ${done ? "bg-sage text-white border-sage" : "bg-ivory border-sage text-sage-dark hover:bg-sage-light"}`}>
              {done ? "✓" : ch}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
