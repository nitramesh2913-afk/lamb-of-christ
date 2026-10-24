import { generatePrayer } from "@/lib/prayer/generate";
import { checkRate } from "@/lib/prayer/ratelimit";
import type { PrayerFailure, PrayerResponse } from "@/lib/prayer/types";
import { validateRequest } from "@/lib/prayer/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const HEADERS = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };

function send(body: PrayerResponse, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
}
const fail = (f: Omit<PrayerFailure, "ok">, status: number, extra?: Record<string, string>) => send({ ok: false, ...f }, status, extra);

// Privacy: this handler never logs the request body or the generated prayer.
export async function POST(request: Request) {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || request.headers.get("x-real-ip") || "unknown";
  const rate = checkRate(ip);
  if (!rate.allowed) {
    return fail({ code: "rate_limited", message: "You're sending requests quickly. Please wait a moment and try again.", retryAfterSeconds: rate.retryAfterSeconds }, 429, { "Retry-After": String(rate.retryAfterSeconds) });
  }

  let raw: string;
  try { raw = await request.text(); } catch { return fail({ code: "invalid_input", message: "We couldn't read your request." }, 400); }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return fail({ code: "too_large", message: "That request is too long." }, 413);

  let json: unknown;
  try { json = JSON.parse(raw); } catch { return fail({ code: "invalid_input", message: "We couldn't read your request." }, 400); }

  const v = validateRequest(json);
  if (!v.ok) return send(v.failure, 400);

  try {
    return send(await generatePrayer(v.value));
  } catch (e) {
    console.error("prayer route failed:", e instanceof Error ? e.name : "unknown"); // name only: never the content
    return fail({ code: "unknown", message: "Something went wrong. Please try again." }, 500);
  }
}

export function GET() {
  return fail({ code: "invalid_input", message: "Use POST." }, 405, { Allow: "POST" });
}
