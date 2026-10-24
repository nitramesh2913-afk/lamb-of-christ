import type { PrayerFailure, PrayerRequest, PrayerResponse } from "./prayer/types";

/** Browser-side call to our own API route. Never throws: every failure becomes a PrayerFailure the UI can show. */
export async function requestPrayer(req: PrayerRequest, fetchImpl: typeof fetch = fetch): Promise<PrayerResponse> {
  let res: Response;
  try {
    res = await fetchImpl("/api/prayer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req), cache: "no-store" });
  } catch {
    return { ok: false, code: "network", message: "We couldn't connect. Please check your internet connection and try again." };
  }
  try {
    const data = (await res.json()) as PrayerResponse;
    if (data && typeof data === "object" && "ok" in data) return data;
  } catch { /* fall through */ }
  const f: PrayerFailure = { ok: false, code: res.status === 429 ? "rate_limited" : "unknown", message: "Something went wrong. Please try again in a moment." };
  return f;
}
