import Link from "next/link";
import { BOOKS, DAILY_VERSE } from "@/lib/books";
import { BookCard } from "@/components/BookCard";
import { Footprints } from "@/components/Footprints";
import { Logo } from "@/components/Logo";
import { HomeProgress } from "@/components/HomeProgress";

export default function Home() {
  return (
    <div className="space-y-6 animate-fadeUp">
      <header className="flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2"><Logo size={36} /><span className="font-display font-extrabold text-sm leading-tight">LAMB OF CHRIST</span></div>
        <Link href="/journey" aria-label="Profile and settings" className="w-11 h-11 grid place-items-center rounded-full bg-ivory/80 border border-gold/20">⚙︎</Link>
      </header>

      <section>
        <p className="text-cocoa-soft font-semibold">Welcome back, fellow traveler.</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight">Walk Daily on the Bible Way</h1>
      </section>

      <section className="panel p-5 flex gap-4 items-center" aria-label="Daily Scripture">
        <div className="flex-1">
          <p className="text-xs font-extrabold tracking-wide text-gold uppercase">Today&rsquo;s verse</p>
          <blockquote className="font-display text-lg font-bold mt-1">&ldquo;{DAILY_VERSE.text}&rdquo;</blockquote>
          <p className="text-sm text-cocoa-soft mt-1">{DAILY_VERSE.ref} ({DAILY_VERSE.translation})</p>
        </div>
      </section>

      <HomeProgress />

      <section aria-labelledby="map-h">
        <h2 id="map-h" className="font-display text-2xl font-extrabold text-center">One Step Closer Each Day.</h2>
        <div className="mt-4 md:grid md:grid-cols-1">
          {BOOKS.map((b, i) => (
            <div key={b.slug}>
              <BookCard book={b} />
              {i < BOOKS.length - 1 && <Footprints flip={i % 2 === 1} />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
