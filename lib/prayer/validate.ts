import { EMOTIONS, LANGUAGES, LENGTHS, MAX_SITUATION, MIN_SITUATION, PrayerFailure, PrayerRequest } from "./types";

export type Validated = { ok: true; value: PrayerRequest } | { ok: false; failure: PrayerFailure };

/** Strip control characters (except newline/tab) and normalise whitespace at the edges. */
function clean(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").trim();
}

/** Validate untrusted input. Used by both the client form and the API route so the rules cannot drift. */
export function validateRequest(input: unknown): Validated {
  const fieldErrors: NonNullable<PrayerFailure["fieldErrors"]> = {};
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const situation = typeof o.situation === "string" ? clean(o.situation) : "";
  if (typeof o.situation !== "string" || situation.length === 0) fieldErrors.situation = "Please tell us a little about what's on your heart.";
  else if (situation.length < MIN_SITUATION) fieldErrors.situation = `Please share a little more (at least ${MIN_SITUATION} characters).`;
  else if (situation.length > MAX_SITUATION) fieldErrors.situation = `Please keep it under ${MAX_SITUATION} characters.`;

  let emotion: PrayerRequest["emotion"];
  if (o.emotion !== undefined && o.emotion !== null && o.emotion !== "") {
    if (typeof o.emotion === "string" && (EMOTIONS as readonly string[]).includes(o.emotion)) emotion = o.emotion as PrayerRequest["emotion"];
    else fieldErrors.emotion = "That feeling isn't one we recognise.";
  }

  const language = o.language === undefined ? "en" : o.language;
  if (!(typeof language === "string" && (LANGUAGES as readonly string[]).includes(language))) fieldErrors.language = "Please choose English, Tamil or Tanglish.";

  const length = o.length === undefined ? "concise" : o.length;
  if (!(typeof length === "string" && (LENGTHS as readonly string[]).includes(length))) fieldErrors.length = "Please choose concise or more detailed.";

  if (Object.keys(fieldErrors).length) {
    return { ok: false, failure: { ok: false, code: "invalid_input", message: "Please check your request and try again.", fieldErrors } };
  }
  return { ok: true, value: { situation, emotion, language: language as PrayerRequest["language"], length: length as PrayerRequest["length"] } };
}
