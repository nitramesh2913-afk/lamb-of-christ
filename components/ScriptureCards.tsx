import type { ScriptureItem } from "@/lib/prayer/types";

/**
 * Scripture is rendered in its own region, separate from the prayer text, with each kind of content labelled:
 *  - the quotation: verified KJV text from our curated collection
 *  - the paraphrase: a plain-language summary (not a quotation)
 *  - the note: a curated or AI-tailored explanation of why it was chosen
 */
export function ScriptureCards({ items, note, language }: { items: ScriptureItem[]; note?: string; language: string }) {
  return (
    <section aria-labelledby="scripture-h" className="space-y-3" data-testid="scripture-region">
      <h2 id="scripture-h" className="font-display text-xl font-extrabold">Scripture to pray with</h2>
      {language !== "en" && (
        <p className="text-sm text-cocoa-soft">Scripture is shown in English (King James Version). A verified Tamil Bible text isn&rsquo;t part of the app yet.</p>
      )}
      {items.length === 0 && note && <p className="panel p-4 text-cocoa-soft" data-testid="no-scripture">{note}</p>}
      {items.map((s) => (
        <article key={s.id} className="panel p-5 space-y-3" aria-label={s.ref}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-extrabold">{s.ref}</h3>
            <span className="chip bg-sage-light text-sage-dark">Verified Scripture · {s.translation}</span>
          </div>
          <blockquote data-testid="scripture-quote" className="border-l-4 border-sage pl-4 italic leading-relaxed">{s.quote}</blockquote>
          <div>
            <p className="text-xs font-extrabold tracking-wide text-gold uppercase">In plain words <span className="normal-case font-bold">(a paraphrase, not a quotation)</span></p>
            <p data-testid="scripture-paraphrase" className="text-cocoa-soft">{s.paraphrase}</p>
          </div>
          <div>
            <p className="text-xs font-extrabold tracking-wide text-gold uppercase">
              Why this fits <span className="normal-case font-bold">({s.whySource === "ai" ? "AI-written note" : "curated note"})</span>
            </p>
            <p data-testid="scripture-why" className="text-cocoa-soft">{s.why}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
