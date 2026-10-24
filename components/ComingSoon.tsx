import Link from "next/link";

export function ComingSoon({ title, intro, items, stage }: { title: string; intro: string; items: string[]; stage: string }) {
  return (
    <section className="animate-fadeUp space-y-5">
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <p className="text-cocoa-soft">{intro}</p>
      <div className="panel p-5">
        <span className="chip bg-sage-light text-sage-dark">Planned for {stage}</span>
        <ul className="mt-3 space-y-2 list-disc list-inside">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>
      <Link href="/" className="btn">Back to the adventure map</Link>
    </section>
  );
}
