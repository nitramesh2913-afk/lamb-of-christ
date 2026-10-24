"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SavedPrayer, newId } from "@/lib/journal";
import { usePrayers } from "@/lib/usePrayers";
import { requestPrayer } from "@/lib/prayerClient";
import { validateRequest } from "@/lib/prayer/validate";
import {
  AI_NOTICE, EMOTIONS, EMOTION_LABEL, LANGUAGES, LANGUAGE_LABEL, LENGTHS, LENGTH_LABEL, MAX_SITUATION,
  Emotion, PrayerFailure, PrayerLanguage, PrayerLength, PrayerSuccess, SafetyNotice, ScriptureItem,
} from "@/lib/prayer/types";
import { PrayerArt } from "./PrayerArt";
import { SavedPrayers } from "./SavedPrayers";
import { ScriptureCards } from "./ScriptureCards";
import { useAccount } from "./AccountProvider";

interface Draft {
  id: string; createdAt: string;
  text: string;
  baseAi: string | null;            // the AI text this draft started from; null if the user wrote it themselves
  scripture: ScriptureItem[]; scriptureNote?: string;
  safety?: SafetyNotice;
  degraded?: PrayerSuccess["degraded"];
  language: PrayerLanguage;
}

const field = "mt-1 w-full rounded-2xl border border-gold/30 bg-white/70 p-3";
const pill = "inline-flex items-center justify-center min-h-[44px] px-4 rounded-full border border-gold/30 bg-ivory font-bold cursor-pointer transition peer-checked:bg-sage peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sage-dark";

export function PrayerView({ initialId }: { initialId?: string }) {
  const { prayers, entries, ready, getPrayer, savePrayer, saveToJournal, removePrayer, removeAllPrayers } = usePrayers();
  const { user, syncStatus, syncError, retrySync } = useAccount();

  const [situation, setSituation] = useState("");
  const [emotion, setEmotion] = useState<Emotion | undefined>();
  const [language, setLanguage] = useState<PrayerLanguage>("en");
  const [length, setLength] = useState<PrayerLength>("concise");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<PrayerFailure | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState("");       // polite confirmation messages
  const [problem, setProblem] = useState("");     // storage/copy problems
  const [confirmRegen, setConfirmRegen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const opened = useRef<string | null>(null);

  const saved = draft ? getPrayer(draft.id) : undefined;
  const linkedEntry = saved?.journalEntryId ? entries.find((e) => e.id === saved.journalEntryId) : undefined;
  const dirty = !!draft && !!saved && (saved.text !== draft.text || saved.situation !== situation.trim() || saved.emotion !== emotion || saved.language !== language || saved.length !== length);
  const edited = !!draft && draft.baseAi !== null && draft.text !== draft.baseAi;

  const open = (p: SavedPrayer) => {
    setSituation(p.situation); setEmotion(p.emotion); setLanguage(p.language); setLength(p.length);
    setDraft({ id: p.id, createdAt: p.createdAt, text: p.text, baseAi: p.origin === "ai" ? p.text : p.origin === "edited" ? "" : null, scripture: p.scripture, language: p.language });
    setFailure(null); setErrors({}); setStatus(""); setProblem(""); setConfirmRegen(false);
    topRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!ready || !initialId || opened.current === initialId) return;
    const p = getPrayer(initialId);
    if (p) { opened.current = initialId; open(p); }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setSituation(""); setEmotion(undefined); setLanguage("en"); setLength("concise");
    setDraft(null); setFailure(null); setErrors({}); setStatus(""); setProblem(""); setConfirmRegen(false);
  };

  async function generate(isRegen = false) {
    setStatus(""); setProblem(""); setFailure(null); setConfirmRegen(false);
    const v = validateRequest({ situation, emotion, language, length });
    if (!v.ok) { setErrors(v.failure.fieldErrors ?? {}); return; }
    setErrors({}); setLoading(true);
    const res = await requestPrayer(v.value);
    setLoading(false);
    if (!res.ok) { setFailure(res); return; }
    const base = draft ?? { id: newId(), createdAt: new Date().toISOString(), text: "", baseAi: null, scripture: [], language };
    if (res.prayer === null) {
      // Verified Scripture is still shown. On a regenerate, we keep whatever the person already has.
      setDraft({ ...base, text: isRegen ? base.text : "", baseAi: isRegen ? base.baseAi : null, scripture: res.scripture, scriptureNote: res.scriptureNote, safety: res.safety, degraded: res.degraded, language });
    } else {
      setDraft({ ...base, text: res.prayer, baseAi: res.prayer, scripture: res.scripture, scriptureNote: res.scriptureNote, safety: res.safety, degraded: undefined, language });
    }
  }

  const build = (): SavedPrayer | null => {
    if (!draft) return null;
    const now = new Date().toISOString();
    return {
      id: draft.id, createdAt: draft.createdAt, updatedAt: now, situation: situation.trim(), emotion, language, length,
      text: draft.text.trim(), origin: draft.baseAi === null ? "written" : draft.text === draft.baseAi ? "ai" : "edited",
      scripture: draft.scripture, journalEntryId: saved?.journalEntryId,
    };
  };

  const onSave = () => {
    const p = build(); if (!p) return;
    if (!p.text) { setProblem("Write or generate a prayer first."); return; }
    setProblem("");
    if (savePrayer(p)) setStatus(user ? "Saved on this device and queued to sync to your account." : "Saved privately on this device.");
    else setProblem("We couldn't save this on your device. Your browser storage may be full or blocked.");
  };
  const onJournal = () => {
    const p = build(); if (!p) return;
    if (!p.text) { setProblem("Write or generate a prayer first."); return; }
    setProblem("");
    if (saveToJournal(p)) setStatus(linkedEntry ? "Your journal entry has been updated." : "Saved to My Walk with God.");
    else setProblem("We couldn't save this on your device. Your browser storage may be full or blocked.");
  };
  const onCopy = async () => {
    if (!draft?.text) return;
    try { await navigator.clipboard.writeText(draft.text); setStatus("Prayer copied."); setProblem(""); }
    catch { setProblem("We couldn't copy automatically. Select the text and copy it instead."); }
  };

  const retryNote = (n?: number) => (n ? ` Please try again in about ${n} second${n === 1 ? "" : "s"}.` : "");

  return (
    <section className="space-y-6 animate-fadeUp">
      <div ref={topRef} className="space-y-3">
        <PrayerArt className="w-full max-h-32 rounded-blob" />
        <h1 className="font-display text-3xl font-extrabold">Pray for My Situation</h1>
        <p className="text-cocoa-soft">Tell God what&rsquo;s on your heart in your own words. We&rsquo;ll offer Scripture and a prayer to start from, which you can change until it sounds like you.</p>
      </div>

      <form className="panel p-5 space-y-5" noValidate aria-label="Prayer request" onSubmit={(e) => { e.preventDefault(); generate(false); }}>
        <label className="block">
          <span className="font-bold">What&rsquo;s on your heart?</span>
          <textarea rows={5} value={situation} maxLength={MAX_SITUATION} onChange={(e) => setSituation(e.target.value)} className={field}
            aria-invalid={!!errors.situation} aria-describedby={errors.situation ? "situation-err" : "situation-count"}
            placeholder="Describe what you're going through, in your own words…" />
          <span id="situation-count" className="block text-xs text-cocoa-soft text-right">{situation.length} / {MAX_SITUATION}</span>
          {errors.situation && <span id="situation-err" role="alert" className="block text-sm font-bold text-cocoa">{errors.situation}</span>}
        </label>

        <fieldset>
          <legend className="font-bold">How are you feeling? <span className="font-normal text-cocoa-soft">(optional)</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {EMOTIONS.map((e) => (
              <button key={e} type="button" aria-pressed={emotion === e} onClick={() => setEmotion(emotion === e ? undefined : e)}
                className={`min-h-[44px] px-4 rounded-full border border-gold/30 font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-dark ${emotion === e ? "bg-sage text-white" : "bg-ivory hover:bg-cream-deep"}`}>
                {EMOTION_LABEL[e]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="font-bold">Language</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <label key={l} className="relative">
                  <input type="radio" name="language" value={l} checked={language === l} onChange={() => setLanguage(l)} className="peer sr-only" />
                  <span className={pill}>{LANGUAGE_LABEL[l]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-bold">Length</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <label key={l} className="relative">
                  <input type="radio" name="length" value={l} checked={length === l} onChange={() => setLength(l)} className="peer sr-only" />
                  <span className={pill}>{LENGTH_LABEL[l]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn" disabled={loading} aria-busy={loading}>{loading ? "Writing your prayer…" : draft ? "Generate a new prayer" : "Generate prayer"}</button>
            {draft && <button type="button" className="btn-ghost" onClick={reset}>Start a new prayer</button>}
          </div>
          <p className="text-xs text-cocoa-soft">Private by default. To write the prayer, what you type is sent to an AI service. We don&rsquo;t keep it on our server. When you save, it stays in this browser unless you sign in, in which case it syncs to your private account.</p>
        </div>
      </form>

      {loading && <p role="status" className="panel p-4">Writing your prayer… this can take a few seconds.</p>}

      {failure && (
        <div role="alert" className="panel p-4 space-y-2 border-gold" data-testid="prayer-error" data-code={failure.code}>
          <p className="font-bold">{failure.message}{retryNote(failure.retryAfterSeconds)}</p>
          {failure.code !== "invalid_input" && <button type="button" className="btn-ghost" onClick={() => generate(!!draft)}>Try again</button>}
        </div>
      )}

      {draft?.safety && (
        <aside role="note" aria-label="Support" className="panel p-5 border-gold space-y-2" data-testid="safety-notice">
          <h2 className="font-display text-lg font-extrabold">You&rsquo;re not alone</h2>
          <p>{draft.safety.message}</p>
        </aside>
      )}

      {draft && (
        <>
          {draft.degraded && (
            <div role="status" className="panel p-4 space-y-2" data-testid="prayer-degraded" data-code={draft.degraded.code}>
              <p className="font-bold">{draft.degraded.message}{retryNote(draft.degraded.retryAfterSeconds)}</p>
              {draft.degraded.code !== "not_configured" && <button type="button" className="btn-ghost" onClick={() => generate(!!draft.text)}>Try again</button>}
            </div>
          )}

          <section aria-labelledby="prayer-h" className="panel p-5 space-y-3" data-testid="prayer-region">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="prayer-h" className="font-display text-xl font-extrabold">Your prayer</h2>
              {draft.baseAi !== null && <span className="chip bg-cream-deep text-cocoa">{edited ? "AI-generated · edited by you" : "AI-generated"}</span>}
              {draft.baseAi === null && draft.text && <span className="chip bg-cream-deep text-cocoa">Written by you</span>}
            </div>
            {draft.baseAi !== null && <p className="text-sm text-cocoa-soft" data-testid="ai-notice">{AI_NOTICE}</p>}
            <label className="block">
              <span className="sr-only">Your prayer</span>
              <textarea rows={length === "detailed" ? 12 : 7} value={draft.text} lang={draft.language === "ta" ? "ta" : "en"}
                placeholder="Write your own prayer here, or generate one above."
                onChange={(e) => { setDraft({ ...draft, text: e.target.value }); setStatus(""); }} className={field} />
            </label>

            {confirmRegen ? (
              <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm regenerate">
                <span className="font-bold">This replaces your edits. Continue?</span>
                <button type="button" className="btn" onClick={() => generate(true)}>Yes, regenerate</button>
                <button type="button" className="btn-ghost" onClick={() => setConfirmRegen(false)}>Keep my edits</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={onCopy} disabled={!draft.text}>Copy prayer</button>
                <button type="button" className="btn-ghost" disabled={loading} onClick={() => (edited ? setConfirmRegen(true) : generate(true))}>Regenerate</button>
                <button type="button" className="btn" onClick={onSave} disabled={!draft.text}>{saved ? (dirty ? "Update saved prayer" : "Saved ✓ (update)") : "Save prayer"}</button>
                <button type="button" className="btn" onClick={onJournal} disabled={!draft.text}>{linkedEntry ? "Update journal entry" : "Save to My Walk with God"}</button>
              </div>
            )}
            {status && <p role="status" className="font-bold text-sage-dark">{status}{status.includes("My Walk") || status.includes("journal entry") ? <> <Link className="underline" href={`/journal/edit?id=${linkedEntry?.id ?? saved?.journalEntryId ?? ""}`}>Open entry</Link></> : null}</p>}
            {user && syncStatus === "error" && <p role="status" className="text-sm text-cocoa-soft">Your local copy is safe; account sync failed: {syncError} <button type="button" className="font-bold underline" onClick={retrySync}>Retry</button></p>}
            {problem && <p role="alert" className="font-bold text-cocoa">{problem}</p>}
          </section>

          <ScriptureCards items={draft.scripture} note={draft.scriptureNote} language={language} />

          <p className="text-sm text-cocoa-soft">
            Lamb of Christ is a Bible-learning app. It is not a pastor, counsellor, therapist or emergency service, and a prayer here can&rsquo;t promise any particular outcome. For serious worries about your safety, health or relationships, please also speak with someone you trust or a qualified professional.
          </p>
        </>
      )}

      {ready && (
        <SavedPrayers prayers={prayers} entries={entries} onOpen={open}
          onDelete={(id, alsoEntry) => { removePrayer(id, alsoEntry); if (draft?.id === id) reset(); }}
          onDeleteAll={() => { removeAllPrayers(); reset(); }} />
      )}
    </section>
  );
}
