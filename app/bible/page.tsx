import { BOOKS } from "@/lib/books";
import { BookCard } from "@/components/BookCard";

export default function BibleExplorer() {
  return (
    <section className="space-y-5 animate-fadeUp">
      <h1 className="font-display text-3xl font-extrabold">Bible</h1>
      <p className="text-cocoa-soft">Choose a book to open its chapters and lessons.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {BOOKS.map((b) => <BookCard key={b.slug} book={b} />)}
      </div>
    </section>
  );
}
