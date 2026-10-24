// Simple in-memory fixed-window limiter. It protects your LLM bill from a single noisy client,
// but memory is per server instance: on serverless/multi-instance hosting use a shared store (e.g. Redis).
const hits = new Map<string, { count: number; reset: number }>();
export const LIMIT = 8;
export const WINDOW_MS = 60_000;

export function checkRate(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  if (hits.size > 5000) hits.forEach((v, k) => { if (v.reset <= now) hits.delete(k); });
  const cur = hits.get(key);
  if (!cur || cur.reset <= now) { hits.set(key, { count: 1, reset: now + WINDOW_MS }); return { allowed: true, retryAfterSeconds: 0 }; }
  if (cur.count >= LIMIT) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((cur.reset - now) / 1000)) };
  cur.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
export const _resetRateLimit = () => hits.clear();
