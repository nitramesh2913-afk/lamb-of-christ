import { NO_PASSAGE_NOTE, retrievePassages, toScriptureItem } from "./bible";
import { LlmError, SYSTEM_PROMPT, buildUserPrompt, callLlm, parseModelOutput, readConfig } from "./llm";
import { detectSupportNeed } from "./safety";
import type { PrayerRequest, PrayerResponse, PrayerErrorCode } from "./types";

export interface Deps { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }

const DEGRADED_MESSAGE: Record<PrayerErrorCode, string> = {
  not_configured: "Prayer writing isn't set up on this server yet, so here is Scripture to pray with. You can write your own prayer below.",
  rate_limited: "The prayer service is busy right now. Your Scripture is below, and you can try again shortly.",
  network: "We couldn't reach the prayer service. Your Scripture is below, and you can try again.",
  upstream: "The prayer service had a problem. Your Scripture is below, and you can try again.",
  invalid_response: "We couldn't produce a prayer we were happy to show you. Your Scripture is below, and you can try again.",
  invalid_input: "", too_large: "", unknown: "Something went wrong writing the prayer. Your Scripture is below, and you can try again.",
};

/**
 * Orchestrates one request: retrieve verified passages -> ask the LLM for a prayer + per-passage notes -> validate.
 * Raw request text is only ever placed in the prompt; it is not logged or stored here.
 */
export async function generatePrayer(req: PrayerRequest, deps: Deps = {}): Promise<PrayerResponse> {
  const passages = retrievePassages(req.situation, req.emotion);
  const support = detectSupportNeed(req.situation);
  const base = {
    ok: true as const, prayerLanguage: req.language,
    ...(support ? { safety: support } : {}),
    ...(passages.length === 0 ? { scriptureNote: NO_PASSAGE_NOTE } : {}),
  };
  const curated = passages.map((p) => toScriptureItem(p));
  const degrade = (code: PrayerErrorCode, retryAfterSeconds?: number): PrayerResponse => ({
    ...base, prayer: null, scripture: curated,
    degraded: { code, message: DEGRADED_MESSAGE[code], ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
  });

  const cfg = readConfig(deps.env ?? process.env);
  if (!cfg) return degrade("not_configured");

  try {
    const text = await callLlm(
      cfg, SYSTEM_PROMPT,
      buildUserPrompt({ ...req, passages, support: !!support }),
      req.length === "detailed" ? 1400 : 700, deps.fetchImpl ?? fetch,
    );
    const { prayer, explanations } = parseModelOutput(text, new Set(passages.map((p) => p.id)), req.language);
    return { ...base, prayer, scripture: passages.map((p) => toScriptureItem(p, explanations.get(p.id))) };
  } catch (e) {
    if (e instanceof LlmError) return degrade(e.code, e.retryAfterSeconds);
    return degrade("unknown");
  }
}
