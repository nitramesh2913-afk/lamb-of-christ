// Shared types and constants for Stage 4 (Personalized Prayer). Safe to import from client and server.

export const EMOTIONS = ["anxious", "sad", "grateful", "lonely", "confused", "hopeful", "distant"] as const;
export type Emotion = (typeof EMOTIONS)[number];
export const EMOTION_LABEL: Record<Emotion, string> = {
  anxious: "Anxious", sad: "Sad", grateful: "Grateful", lonely: "Lonely",
  confused: "Confused", hopeful: "Hopeful", distant: "Spiritually distant",
};

export const LANGUAGES = ["en", "ta", "tanglish"] as const;
export type PrayerLanguage = (typeof LANGUAGES)[number];
export const LANGUAGE_LABEL: Record<PrayerLanguage, string> = { en: "English", ta: "தமிழ் (Tamil)", tanglish: "Tanglish" };

export const LENGTHS = ["concise", "detailed"] as const;
export type PrayerLength = (typeof LENGTHS)[number];
export const LENGTH_LABEL: Record<PrayerLength, string> = { concise: "Concise", detailed: "More detailed" };

export const MIN_SITUATION = 10;
export const MAX_SITUATION = 2000;

/** A verified Bible passage in our curated corpus. Only `verses[].text` is Scripture. */
export interface Passage {
  id: string;
  book: string; chapter: number; from: number; to: number;
  ref: string;                 // e.g. "Philippians 4:6–7"
  translation: "KJV";
  verses: { n: number; text: string }[];
  emotions: Emotion[];
  keywords: string[];
  plain: string;               // plain-language paraphrase (editorial, NOT a quotation)
  why: string;                 // curated note on why the passage is relevant (editorial)
}

export interface PrayerRequest {
  situation: string;
  emotion?: Emotion;
  language: PrayerLanguage;
  length: PrayerLength;
}

/** One Scripture item returned to the client. `quote` is verified KJV text copied from our corpus, never from the LLM. */
export interface ScriptureItem {
  id: string;
  ref: string;
  translation: "KJV";
  quote: string;                    // verified quotation (KJV)
  paraphrase: string;               // plain-language paraphrase, labelled as such in the UI
  why: string;                      // why this passage fits
  whySource: "curated" | "ai";      // curated note, or AI-tailored to this request
}

export type SafetyNotice = { level: "support"; message: string };

export type PrayerErrorCode =
  | "invalid_input" | "not_configured" | "rate_limited" | "network" | "upstream" | "invalid_response" | "too_large" | "unknown";

export interface PrayerSuccess {
  ok: true;
  prayer: string | null;            // AI-generated text; null when generation was unavailable
  prayerLanguage: PrayerLanguage;
  scripture: ScriptureItem[];       // may be empty: see scriptureNote
  scriptureNote?: string;           // set when no suitable verified passage was found
  safety?: SafetyNotice;
  /** Present when verified Scripture was found but the prayer itself could not be generated. */
  degraded?: { code: PrayerErrorCode; message: string; retryAfterSeconds?: number };
}
export interface PrayerFailure {
  ok: false;
  code: PrayerErrorCode;
  message: string;
  retryAfterSeconds?: number;
  fieldErrors?: Partial<Record<"situation" | "emotion" | "language" | "length", string>>;
}
export type PrayerResponse = PrayerSuccess | PrayerFailure;

export const AI_NOTICE =
  "This prayer was written by AI to help you put your thoughts into words. It is not a message from God, and it can't promise any outcome. Edit it until it sounds like you.";
