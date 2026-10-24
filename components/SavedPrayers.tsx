"use client";
import Link from "next/link";
import { useState } from "react";
import { EMOTION_LABEL } from "@/lib/prayer/types";
import { SavedPrayer, JournalEntry, exportJson } from "@/lib/journal";
import { useAccount } from "./AccountProvider";

interface Props {
  prayers: SavedPrayer[];
  entries: JournalEntry[];
  onOpen: (p: SavedPrayer) => void;
  onDelete: (id: string, alsoEntry: boolean) => void;
  onDeleteAll: () => void;
}

const snippet = (s: string) => (s.length > 120 ? s.slice(0, 120) + "…" : s);

export function SavedPrayers({ prayers, entries, onOpen, onDelete, onDeleteAll }: Props) {
  const { user } = useAccount();
  const [pending, setPending] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  if (prayers.length === 0) return null;

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson(entries, prayers)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "my-walk-with-god.json"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="saved-h" className="space-y-3">
      <h2 id="saved-h" className="font-display text-xl font-extrabold">My saved prayers</h2>
      {prayers.map((p) => {
        const linked = !!p.journalEntryId && entries.some((e) => e.id === p.journalEntryId);
        return (
          <article key={p.id} className="panel p-4 space-y-2" aria-label={`Saved prayer from ${new Date(p.createdAt).toLocaleDateString()}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gold">{new Date(p.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
              {p.emotion && <span className="chip bg-sage-light text-sage-dark">{EMOTION_LABEL[p.emotion]}</span>}
              {linked && <span className="chip bg-cream-deep text-cocoa">In my journal</span>}
            </div>
            <p className="text-cocoa-soft">{snippet(p.text || p.situation)}</p>
            {p.scripture.length > 0 && <p className="text-xs font-bold text-gold">{p.scripture.map((s) => s.ref).join(" · ")}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-ghost" onClick={() => onOpen(p)}>Open &amp; edit</button>
              {linked && <Link href={`/journal/edit?id=${p.journalEntryId}`} className="btn-ghost">View journal entry</Link>}
              {pending !== p.id ? (
                <button type="button" className="btn-ghost" onClick={() => setPending(p.id)}>Delete</button>
              ) : (
                <span className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm delete prayer">
                  <span className="font-bold">Delete this prayer for good?</span>
                  <button type="button" className="btn" onClick={() => { onDelete(p.id, false); setPending(null); }}>
                    {linked ? "Delete prayer only" : "Yes, delete"}
                  </button>
                  {linked && <button type="button" className="btn" onClick={() => { onDelete(p.id, true); setPending(null); }}>Delete prayer and journal entry</button>}
                  <button type="button" className="btn-ghost" onClick={() => setPending(null)}>Keep it</button>
                </span>
              )}
            </div>
          </article>
        );
      })}
      <div className="panel p-4 space-y-3">
        <h3 className="font-display font-extrabold">Your data</h3>
        <p className="text-sm text-cocoa-soft">{user ? "Saved prayers sync privately to your account. Download a copy any time. Journal entries you created from a prayer stay in My Walk with God until you delete them there." : "Saved prayers stay in this browser. Create an account to sync them across devices. Journal entries you created from a prayer stay in My Walk with God until you delete them there."}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" className="btn-ghost" onClick={download}>Download my journal &amp; prayers</button>
          {!confirmAll ? <button type="button" className="btn-ghost" onClick={() => setConfirmAll(true)}>Delete all saved prayers</button> : (
            <span className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm delete all prayers">
              <span className="font-bold">Delete all {prayers.length} saved prayers for good?</span>
              <button type="button" className="btn" onClick={() => { onDeleteAll(); setConfirmAll(false); }}>Yes, delete all</button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmAll(false)}>Keep them</button>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
