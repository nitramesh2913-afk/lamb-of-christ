import type { SafetyNotice } from "./types";

// Conservative phrase list for self-harm / danger signals in English, Tamil script and Tanglish.
// This is a simple keyword check, not a clinical screen: it can miss things and can over-match, which is the safer error.
const PATTERNS: RegExp[] = [
  /\bsuicid/i, /\bkill\s+(my\s*self|myself)\b/i, /\bend\s+(it\s+all|my\s+life|my\s+own\s+life)\b/i, /\bwant(ed)?\s+to\s+die\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i, /\b(no|not)\s+(reason|point)\s+(to|in)\s+(live|living|going\s+on)\b/i,
  /\bself[-\s]?harm/i, /\b(hurt|harm|cut)(ting)?\s+(my\s*self|myself)\b/i, /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up)\b/i,
  /தற்கொலை/, /\bthat?kolai\b/i, /\bsaga\s+virumb/i,
];

export function detectSupportNeed(text: string): SafetyNotice | undefined {
  if (!PATTERNS.some((r) => r.test(text))) return undefined;
  return {
    level: "support",
    message:
      "What you shared sounds very heavy, and you matter. A prayer can be a comfort, but it can't replace a caring person beside you. " +
      "If you might hurt yourself or are in danger, please contact your local emergency number right now, or a crisis line in your country " +
      "(for example 988 in the US, or Tele-MANAS 14416 in India). You could also reach out to a trusted friend, family member or pastor today. " +
      "This app is not a pastor, therapist or emergency service.",
  };
}
