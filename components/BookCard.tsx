"use client";
import Link from "next/link";
import { Book, STATUS_LABEL } from "@/lib/books";
import { useProgress } from "@/lib/useProgress";
import { BookArt } from "./BookArt";
import { ProgressRing } from "./ProgressRing";

export function BookCard({ book }: { book: Book }) {
  const { countFor } = useProgress();
  const done = countFor(book.slug);
  const pct = (done / book.chapters) * 100;
  const locked = book.status === "locked";
  return (
    <Link href={`/bible/${book.slug}`} className="group block panel overflow-hidden shadow-card transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-dark">
      <div className="h-36 relative">
        <BookArt art={book.art} tint={book.tint} />
        {done >= book.chapters && <span className="absolute top-3 right-3 chip bg-ivory text-sage-dark">✓ Done</span>}
        {locked && done === 0 && <span className="absolute top-3 right-3 chip bg-ivory/90 text-cocoa-soft">🔒 Preview</span>}
      </div>
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl font-extrabold">{book.title}</h3>
          <p className="text-sm text-cocoa-soft">{book.blurb}</p>
          <p className={`mt-1 text-xs font-bold ${book.status === "current" ? "text-sage-dark" : "text-gold"}`}>
            {done > 0 ? `${done} of ${book.chapters} chapters explored` : STATUS_LABEL[book.status]}
          </p>
        </div>
        <ProgressRing value={pct} label={`${done} of ${book.chapters} chapters`} />
      </div>
    </Link>
  );
}
