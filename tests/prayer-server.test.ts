// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST, GET } from "@/app/api/prayer/route";
import { NO_PASSAGE_NOTE, getPassage, retrievePassages, stem } from "@/lib/prayer/bible";
import { PASSAGES } from "@/lib/prayer/passages.generated";
import { generatePrayer } from "@/lib/prayer/generate";
import { LlmError, callLlm, parseModelOutput, readConfig } from "@/lib/prayer/llm";
import { _resetRateLimit, LIMIT } from "@/lib/prayer/ratelimit";
import { detectSupportNeed } from "@/lib/prayer/safety";
import { EMOTIONS, MAX_SITUATION, PrayerRequest, PrayerSuccess } from "@/lib/prayer/types";
import { validateRequest } from "@/lib/prayer/validate";
import { LESSONS } from "@/lib/lessons";

const ENV = { LLM_API_KEY: "sk-test-secret-123", LLM_PROVIDER: "anthropic" };
const req = (over: Partial<PrayerRequest> = {}): PrayerRequest => ({ situation: "I am worried about my exams and cannot sleep.", language: "en", length: "concise", ...over });
const PRAYER = "Father, I bring my worry about the exams to you tonight. Steady my heart, help me rest, and give me wisdom for tomorrow. Amen.";
const anthropicReply = (obj: unknown) => new Response(JSON.stringify({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }] }), { status: 200 });

describe("input validation", () => {
  it("accepts a normal request and applies defaults", () => {
    const v = validateRequest({ situation: "  I feel anxious about work.  " });
    expect(v).toEqual({ ok: true, value: { situation: "I feel anxious about work.", emotion: undefined, language: "en", length: "concise" } });
  });
  it.each([
    [{}, "situation"], [{ situation: "" }, "situation"], [{ situation: "   " }, "situation"], [{ situation: "short" }, "situation"],
    [{ situation: 42 }, "situation"], [{ situation: "x".repeat(MAX_SITUATION + 1) }, "situation"],
    [{ situation: "long enough text", emotion: "furious" }, "emotion"],
    [{ situation: "long enough text", language: "fr" }, "language"],
    [{ situation: "long enough text", length: "epic" }, "length"],
  ])("rejects %j with an error on %s", (input, key) => {
    const v = validateRequest(input);
    expect(v.ok).toBe(false);
    if (!v.ok) { expect(v.failure.code).toBe("invalid_input"); expect(v.failure.fieldErrors).toHaveProperty(key as string); }
  });
  it("rejects non-object input and strips control characters", () => {
    expect(validateRequest(null).ok).toBe(false);
    expect(validateRequest("hello").ok).toBe(false);
    const v = validateRequest({ situation: "hello\u0000 there, friend\u0007!" });
    expect(v.ok && v.value.situation).toBe("hello there, friend!");
  });
  it("accepts every supported emotion, language and length", () => {
    for (const emotion of EMOTIONS) for (const language of ["en", "ta", "tanglish"]) for (const length of ["concise", "detailed"])
      expect(validateRequest({ situation: "A situation long enough.", emotion, language, length }).ok).toBe(true);
  });
});

describe("verified Scripture corpus and retrieval", () => {
  it("has unique ids, non-empty verified KJV text, and consistent references", () => {
    const ids = new Set(PASSAGES.map((p) => p.id));
    expect(ids.size).toBe(PASSAGES.length);
    expect(PASSAGES.length).toBeGreaterThanOrEqual(40);
    for (const p of PASSAGES) {
      expect(p.verses.length).toBe(p.to - p.from + 1);
      expect(p.verses.every((v) => v.text.length > 10)).toBe(true);
      expect(p.ref).toMatch(new RegExp(`^${p.book} ${p.chapter}:${p.from}`));
      expect(p.emotions.length).toBeGreaterThan(0);
      expect(p.plain.length).toBeGreaterThan(10);
      expect(p.why.length).toBeGreaterThan(10);
    }
  });
  it("covers every emotion the form offers", () => {
    for (const e of EMOTIONS) expect(PASSAGES.filter((p) => p.emotions.includes(e)).length).toBeGreaterThanOrEqual(4);
  });
  it("matches the app's own lesson text for passages that exist in both (independent cross-check of the source)", () => {
    const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
    const pairs: [string, string, number][] = [["ps-23-1-3", "psalms", 23], ["prov-3-5-6", "proverbs", 3]];
    for (const [id, book, chapter] of pairs) {
      const lesson = LESSONS.find((l) => l.book === book && l.chapter === chapter)!;
      const p = getPassage(id)!;
      expect(norm(p.verses.map((v) => v.text).join(" "))).toBe(norm(lesson.verses.map((v) => v.text).join(" ")));
    }
  });
  it("returns only passages that exist in the corpus, never more than 3, for any emotion", () => {
    for (const e of [undefined, ...EMOTIONS]) {
      const r = retrievePassages("I feel lost and worried and alone and grieving", e);
      expect(r.length).toBeLessThanOrEqual(3);
      for (const p of r) expect(getPassage(p.id)).toBe(p);
    }
  });
  it("prefers passages matching the chosen emotion", () => {
    for (const e of EMOTIONS) expect(retrievePassages("something happened today", e).every((p) => p.emotions.includes(e))).toBe(true);
  });
  it("uses the user's own words when no emotion is chosen", () => {
    expect(retrievePassages("I keep worrying about my exams").some((p) => p.emotions.includes("anxious"))).toBe(true);
    expect(retrievePassages("My mother died and I am grieving").some((p) => p.emotions.includes("sad"))).toBe(true);
    expect(stem("worries")).toBe(stem("worried"));
    expect(stem("grieving")).toBe(stem("grief"));
  });
  it("returns nothing, rather than a loose match, when nothing fits", () => {
    expect(retrievePassages("quarterly spreadsheet formulas for the office printer")).toEqual([]);
  });
});

describe("safety notice", () => {
  it("fires on self-harm language and stays quiet otherwise", () => {
    expect(detectSupportNeed("I want to die")?.message).toMatch(/emergency|crisis/i);
    expect(detectSupportNeed("I keep thinking about suicide")).toBeDefined();
    expect(detectSupportNeed("I am worried about my exam results")).toBeUndefined();
  });
  it("does not present itself as a pastor or therapist", () => {
    expect(detectSupportNeed("I want to die")!.message).toMatch(/not a pastor, therapist or emergency service/i);
  });
});

describe("LLM configuration", () => {
  it("is null without a key, with blank key, or without a model for openai", () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ LLM_API_KEY: "   " })).toBeNull();
    expect(readConfig({ LLM_API_KEY: "k", LLM_PROVIDER: "openai" })).toBeNull();
  });
  it("reads provider, model and base url, and rejects insecure remote urls", () => {
    expect(readConfig({ LLM_API_KEY: "k" })).toMatchObject({ provider: "anthropic", baseUrl: "https://api.anthropic.com" });
    expect(readConfig({ LLM_API_KEY: "k", LLM_PROVIDER: "openai", LLM_MODEL: "m" })).toMatchObject({ provider: "openai", baseUrl: "https://api.openai.com/v1", model: "m" });
    expect(readConfig({ LLM_API_KEY: "k", LLM_BASE_URL: "http://evil.example.com" })).toBeNull();
    expect(readConfig({ LLM_API_KEY: "k", LLM_BASE_URL: "http://localhost:11434/v1/", LLM_PROVIDER: "openai", LLM_MODEL: "m" })?.baseUrl).toBe("http://localhost:11434/v1");
  });
});

describe("callLlm error mapping", () => {
  const cfg = readConfig(ENV)!;
  const call = (f: typeof fetch) => callLlm(cfg, "sys", "user", 100, f);
  it("sends the key only in a header to the right endpoint (anthropic)", async () => {
    const f = vi.fn(async () => anthropicReply("hello"));
    expect(await call(f as unknown as typeof fetch)).toBe("hello");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(ENV.LLM_API_KEY);
    expect(String(init.body)).not.toContain(ENV.LLM_API_KEY);
  });
  it("supports OpenAI-compatible APIs", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), { status: 200 }));
    const c = readConfig({ LLM_API_KEY: "k2", LLM_PROVIDER: "openai", LLM_MODEL: "m" })!;
    expect(await callLlm(c, "s", "u", 50, f as unknown as typeof fetch)).toBe("hi");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer k2");
  });
  it.each([
    [() => new Response("{}", { status: 429, headers: { "retry-after": "12" } }), "rate_limited", 12],
    [() => new Response("{}", { status: 429 }), "rate_limited", 30],
    [() => new Response("{}", { status: 401 }), "not_configured", undefined],
    [() => new Response("{}", { status: 500 }), "upstream", undefined],
    [() => new Response("<html>", { status: 200 }), "invalid_response", undefined],
    [() => new Response(JSON.stringify({ content: [] }), { status: 200 }), "invalid_response", undefined],
  ])("maps upstream response %# to %s", async (make, code, retry) => {
    await expect(call((async () => make()) as unknown as typeof fetch)).rejects.toMatchObject({ code, retryAfterSeconds: retry });
  });
  it("maps network failures and timeouts to a network error", async () => {
    await expect(call((async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch)).rejects.toMatchObject({ code: "network" });
    await expect(call((async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); }) as unknown as typeof fetch)).rejects.toMatchObject({ code: "network", message: expect.stringMatching(/too long/) });
  });
});

describe("parsing model output", () => {
  const ids = new Set(["phil-4-6-7"]);
  it("accepts clean JSON and JSON wrapped in prose or code fences", () => {
    const body = { prayer: PRAYER, explanations: [{ id: "phil-4-6-7", why: "It invites you to bring worry to God." }] };
    expect(parseModelOutput(JSON.stringify(body), ids, "en").prayer).toBe(PRAYER);
    expect(parseModelOutput("```json\n" + JSON.stringify(body) + "\n```", ids, "en").explanations.get("phil-4-6-7")).toMatch(/worry/);
  });
  it("drops explanations for ids that were not supplied (invented references)", () => {
    const out = parseModelOutput(JSON.stringify({ prayer: PRAYER, explanations: [{ id: "made-up-1", why: "Totally invented passage." }] }), ids, "en");
    expect(out.explanations.size).toBe(0);
  });
  it.each([
    ["not json at all"], [JSON.stringify({ nope: 1 })], [JSON.stringify({ prayer: "too short" })], [JSON.stringify({ prayer: 5 })],
    [JSON.stringify({ prayer: "Thus says the Lord: you will be healed by Friday, my child, do not doubt it." })],
  ])("rejects invalid output %#", (text) => {
    expect(() => parseModelOutput(text, ids, "en")).toThrow(LlmError);
  });
  it("checks that Tamil and Tanglish output uses the right script", () => {
    const tamil = "தந்தையே, என் கவலைகளை உம்மிடம் கொண்டு வருகிறேன். எனக்கு அமைதியையும் ஞானத்தையும் தாரும். ஆமென்.";
    expect(parseModelOutput(JSON.stringify({ prayer: tamil }), ids, "ta").prayer).toBe(tamil);
    expect(() => parseModelOutput(JSON.stringify({ prayer: PRAYER }), ids, "ta")).toThrow(/Tamil/);
    expect(() => parseModelOutput(JSON.stringify({ prayer: tamil }), ids, "tanglish")).toThrow(/Tanglish/);
    expect(parseModelOutput(JSON.stringify({ prayer: "Appa, en kavalaigalai ungalidam kondu varugiren. Enakku amaidhiyum gnanamum tharungal. Amen." }), ids, "tanglish").prayer).toMatch(/^Appa/);
  });
});

describe("generatePrayer", () => {
  it("returns an AI prayer plus verified Scripture kept in separate fields", async () => {
    const fetchImpl = vi.fn(async () => anthropicReply({ prayer: PRAYER, explanations: [{ id: "phil-4-6-7", why: "It speaks to your exam worry directly." }] }));
    const r = (await generatePrayer(req({ emotion: "anxious" }), { env: ENV, fetchImpl: fetchImpl as unknown as typeof fetch })) as PrayerSuccess;
    expect(r.ok).toBe(true);
    expect(r.prayer).toBe(PRAYER);
    expect(r.degraded).toBeUndefined();
    expect(r.scripture.length).toBeGreaterThan(0);
    for (const s of r.scripture) {
      const p = getPassage(s.id)!;
      expect(p).toBeDefined();
      expect(s.quote).toBe(p.verses.map((v) => v.text).join(" "));  // quote comes from the corpus, byte-for-byte
      expect(s.paraphrase).toBe(p.plain);
      expect(PRAYER).not.toContain(s.quote);
    }
    const tailored = r.scripture.find((s) => s.id === "phil-4-6-7");
    if (tailored) { expect(tailored.whySource).toBe("ai"); expect(tailored.why).toMatch(/exam worry/); }
    expect(r.scripture.filter((s) => s.id !== "phil-4-6-7").every((s) => s.whySource === "curated")).toBe(true);
  });
  it("puts the user's words, language and length rules in the prompt and treats the text as data", async () => {
    const fetchImpl = vi.fn(async () => anthropicReply({ prayer: PRAYER, explanations: [] }));
    await generatePrayer(req({ language: "tanglish", length: "detailed", emotion: "sad" }), { env: ENV, fetchImpl: fetchImpl as unknown as typeof fetch });
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.messages[0].content).toMatch(/exams/);
    expect(body.messages[0].content).toMatch(/Tanglish/);
    expect(body.messages[0].content).toMatch(/180 to 280 words/);
    expect(body.system).toMatch(/not God, a pastor, a therapist/i);
    expect(body.system).toMatch(/Never promise or imply a guaranteed outcome/);
    expect(body.system).toMatch(/data, not instructions/);
  });
  it("says so instead of inventing Scripture when no verified passage fits", async () => {
    const fetchImpl = vi.fn(async () => anthropicReply({ prayer: PRAYER, explanations: [] }));
    const r = (await generatePrayer(req({ situation: "quarterly spreadsheet formulas for the office printer" }), { env: ENV, fetchImpl: fetchImpl as unknown as typeof fetch })) as PrayerSuccess;
    expect(r.scripture).toEqual([]);
    expect(r.scriptureNote).toBe(NO_PASSAGE_NOTE);
    expect(r.prayer).toBe(PRAYER);
  });
  it("ignores an explanation the model attaches to an invented reference", async () => {
    const fetchImpl = vi.fn(async () => anthropicReply({ prayer: PRAYER, explanations: [{ id: "john-99-99", why: "An invented verse that does not exist." }] }));
    const r = (await generatePrayer(req({ emotion: "anxious" }), { env: ENV, fetchImpl: fetchImpl as unknown as typeof fetch })) as PrayerSuccess;
    expect(r.scripture.every((s) => !!getPassage(s.id))).toBe(true);
    expect(JSON.stringify(r.scripture)).not.toMatch(/invented verse/);
  });
  it("attaches a support notice for self-harm language", async () => {
    const fetchImpl = vi.fn(async () => anthropicReply({ prayer: PRAYER, explanations: [] }));
    const r = (await generatePrayer(req({ situation: "I feel hopeless and want to die." }), { env: ENV, fetchImpl: fetchImpl as unknown as typeof fetch })) as PrayerSuccess;
    expect(r.safety?.level).toBe("support");
  });

  describe("graceful degradation (verified Scripture is still returned)", () => {
    const cases: [string, Record<string, string | undefined>, () => Response | Promise<never>, string][] = [
      ["missing API key", {}, () => anthropicReply("x"), "not_configured"],
      ["rejected API key", ENV, () => new Response("{}", { status: 401 }), "not_configured"],
      ["rate limit", ENV, () => new Response("{}", { status: 429, headers: { "retry-after": "20" } }), "rate_limited"],
      ["server error", ENV, () => new Response("{}", { status: 503 }), "upstream"],
      ["network error", ENV, () => Promise.reject(new TypeError("fetch failed")), "network"],
      ["unparseable output", ENV, () => anthropicReply("I'm sorry, I cannot do that"), "invalid_response"],
      ["output in the wrong language", ENV, () => anthropicReply({ prayer: PRAYER }), "invalid_response"],
    ];
    it.each(cases)("%s", async (name, env, make, code) => {
      const fetchImpl = vi.fn(async () => make());
      const r = (await generatePrayer(req({ emotion: "anxious", language: name === "output in the wrong language" ? "ta" : "en" }), { env, fetchImpl: fetchImpl as unknown as typeof fetch })) as PrayerSuccess;
      expect(r.ok).toBe(true);
      expect(r.prayer).toBeNull();
      expect(r.degraded?.code).toBe(code);
      expect(r.degraded?.message.length).toBeGreaterThan(10);
      expect(r.scripture.length).toBeGreaterThan(0);
      if (code === "rate_limited") expect(r.degraded?.retryAfterSeconds).toBe(20);
      if (name === "missing API key") expect(fetchImpl).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/prayer", () => {
  const saved = { ...process.env };
  const call = (body: unknown, ip = "1.1.1.1", raw = false) =>
    POST(new Request("http://localhost/api/prayer", { method: "POST", headers: { "x-forwarded-for": ip, "content-type": "application/json" }, body: raw ? (body as string) : JSON.stringify(body) }));
  beforeEach(() => { _resetRateLimit(); delete process.env.LLM_API_KEY; });
  afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("submits a valid request and returns prayer + Scripture as JSON with no-store caching", async () => {
    process.env.LLM_API_KEY = ENV.LLM_API_KEY;
    vi.stubGlobal("fetch", vi.fn(async () => anthropicReply({ prayer: PRAYER, explanations: [] })));
    const res = await call({ situation: "I am anxious about tomorrow's interview.", emotion: "anxious", language: "en", length: "concise" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const j = await res.json();
    expect(j.ok).toBe(true); expect(j.prayer).toBe(PRAYER); expect(j.scripture.length).toBeGreaterThan(0);
    expect(JSON.stringify(j)).not.toContain(ENV.LLM_API_KEY);   // key never reaches the browser
  });
  it("returns 200 with a degraded result and Scripture when no key is configured", async () => {
    const res = await call({ situation: "I am anxious about tomorrow's interview.", emotion: "anxious" });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.prayer).toBeNull(); expect(j.degraded.code).toBe("not_configured"); expect(j.scripture.length).toBeGreaterThan(0);
  });
  it("rejects invalid input with 400 and field errors, without calling the LLM", async () => {
    process.env.LLM_API_KEY = "k";
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const res = await call({ situation: "hi", emotion: "angry" });
    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j).toMatchObject({ ok: false, code: "invalid_input" });
    expect(Object.keys(j.fieldErrors).sort()).toEqual(["emotion", "situation"]);
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON (400) and oversized bodies (413)", async () => {
    expect((await call("{oops", "2.2.2.2", true)).status).toBe(400);
    const big = await call({ situation: "x".repeat(40_000) }, "2.2.2.3");
    expect(big.status).toBe(413);
    expect((await big.json()).code).toBe("too_large");
  });
  it("rate limits a noisy client with 429 and Retry-After, while others are unaffected", async () => {
    const body = { situation: "I am anxious about tomorrow's interview." };
    for (let i = 0; i < LIMIT; i++) expect((await call(body, "9.9.9.9")).status).toBe(200);
    const blocked = await call(body, "9.9.9.9");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await blocked.json()).code).toBe("rate_limited");
    expect((await call(body, "8.8.8.8")).status).toBe(200);
  });
  it("answers GET with 405", async () => { expect(GET().status).toBe(405); });

  it("never logs the person's words or the generated prayer", async () => {
    process.env.LLM_API_KEY = ENV.LLM_API_KEY;
    const secret = "MY-PRIVATE-DETAIL-ZEBRA-4471";
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    vi.stubGlobal("fetch", vi.fn(async () => anthropicReply({ prayer: PRAYER })));
    await call({ situation: `${secret} I feel anxious about work` }, "3.3.3.3");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("boom " + secret); }));
    await call({ situation: `${secret} I feel anxious about work` }, "3.3.3.4");
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(secret);
    expect(logged).not.toContain(PRAYER);
  });
});

describe("API key stays server-side", () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (f === "node_modules" || f === ".next") return [];
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
  const root = path.resolve(__dirname, "..");
  it("no client component or shared client module reads LLM settings, and nothing uses a NEXT_PUBLIC_ key", () => {
    const files = [...walk(path.join(root, "app")), ...walk(path.join(root, "components")), ...walk(path.join(root, "lib"))];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(LLM|API_KEY)/);
      if (/^["']use client["']/.test(src)) expect(src, f).not.toMatch(/process\.env|LLM_API_KEY/);
    }
    // The only readers of LLM_API_KEY are the server-side config module, with its docs.
    const readers = files.filter((f) => /LLM_API_KEY/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f).split(path.sep).join("/"));
    expect(readers).toEqual(["lib/prayer/llm.ts"]);
  });
});
