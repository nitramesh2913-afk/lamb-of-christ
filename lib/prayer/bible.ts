import { PASSAGES } from "./passages.generated";
import type { Emotion, Passage, ScriptureItem } from "./types";

export const MAX_PASSAGES = 3;
/** Minimum relevance score. Below this we say so instead of padding with a loosely related verse. */
export const MIN_SCORE = 1;

export const getPassage = (id: string): Passage | undefined => PASSAGES.find((p) => p.id === id);

// Words that appear in almost every prayer request and carry no topical signal.
const STOP = new Set(("the and but for with from have has had not nor you your our their them they his her him its was were been being " +
  "this that these those what when where which who whom will would could should can may might shall just very really feel feeling feels " +
  "about into over under again then than also only some any all more most much many lot want need please pray prayer praying god lord jesus christ " +
  "bible life day time thing things").split(" "));

export function stem(word: string): string {
  let t = word.toLowerCase();
  t = t.replace(/ing$/, "");
  t = t.replace(/(ies|ied)$/, "y");
  t = t.replace(/(ed|es|s|ly)$/, "");
  t = t.replace(/e$/, "").replace(/ief$/, "iev").replace(/y$/, "i");
  return t;
}

function tokens(text: string): string[] {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Rank curated passages for a request. Scoring is deterministic and explainable:
 * +4 for a matching emotion (slightly less for passages tagged with several), +1 per distinct keyword
 * found in the user's words after light stemming. No LLM is involved, so references can never be invented.
 */
export function retrievePassages(situation: string, emotion?: Emotion, limit = MAX_PASSAGES): Passage[] {
  const words = new Set(tokens(situation).map(stem));
  const scored = PASSAGES.map((p, index) => {
    let score = 0;
    if (emotion && p.emotions.includes(emotion)) score += 4 - 0.1 * (p.emotions.length - 1);
    const kw = new Set(p.keywords.map(stem));
    words.forEach((w) => { if (kw.has(w)) score += 1; });
    return { p, score, index };
  });
  return scored
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.p);
}

export function toScriptureItem(p: Passage, aiWhy?: string): ScriptureItem {
  return {
    id: p.id, ref: p.ref, translation: p.translation,
    quote: p.verses.map((v) => v.text).join(" "),
    paraphrase: p.plain,
    why: aiWhy ?? p.why,
    whySource: aiWhy ? "ai" : "curated",
  };
}

export const NO_PASSAGE_NOTE =
  "We couldn't find a verified passage in our current collection that fits what you shared closely enough, so we haven't shown one rather than risk misquoting Scripture. You can search the Bible section, or add a passage you love to your prayer yourself.";
