import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKS, getBook, STATUS_LABEL } from "@/lib/books";
import { BookArt } from "@/components/BookArt";
import { ChapterGrid } from "@/components/ChapterGrid";

export function generateStaticParams() {
  return BOOKS.map((b) => ({ book: b.slug }));
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();
  return (
    <section className="space-y-5 animate-fadeUp">
      <Link href="/bible" className="text-sm font-bold text-sage-dark">← All books</Link>
      <div className="panel overflow-hidden">
        <div className="h-40"><BookArt art={book.art} tint={book.tint} /></div>
        <div className="p-5">
          <h1 className="font-display text-3xl font-extrabold">{book.title}</h1>
          <p className="text-cocoa-soft">{book.blurb}</p>
          <p className="mt-2 text-xs font-bold text-gold">{STATUS_LABEL[book.status]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {book.themes.map((t) => <span key={t} className="chip bg-sage-light text-sage-dark">{t}</span>)}
          </div>
        </div>
      </div>
      <div className="panel p-5">
        <h2 className="font-display text-xl font-extrabold">Chapters ({book.chapters})</h2>
        <p className="text-sm text-cocoa-soft mb-3">Highlighted chapters have a lesson you can open now. Other chapters are coming in later updates.</p>
        <ChapterGrid book={book} />
      </div>
    </section>
  );
}
