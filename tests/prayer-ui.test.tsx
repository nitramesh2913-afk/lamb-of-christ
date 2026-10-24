import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/pray", useSearchParams: () => new URLSearchParams() }));

import { PrayerView } from "@/components/PrayerView";
import { JournalHistory } from "@/components/JournalHistory";
import { JournalEditor } from "@/components/JournalEditor";
import { JOURNAL_KEY, JournalEntry, SavedPrayer, normalizePrayer, saveStore } from "@/lib/journal";
import { getPassage, toScriptureItem } from "@/lib/prayer/bible";
import type { PrayerResponse } from "@/lib/prayer/types";

const PRAYER = "Father, I bring my worry about my exams to you. Steady my heart and help me rest. Amen.";
const phil = toScriptureItem(getPassage("phil-4-6-7")!, "It speaks right to exam worry.");
const peter = toScriptureItem(getPassage("1pet-5-7")!);

const success = (over: Partial<Extract<PrayerResponse, { ok: true }>> = {}): PrayerResponse => ({
  ok: true, prayer: PRAYER, prayerLanguage: "en", scripture: [phil, peter], ...over,
});
const reply = (body: PrayerResponse, status = 200) => async () => new Response(JSON.stringify(body), { status });
const stub = (impl: (url: string, init: RequestInit) => Promise<Response>) => { const f = vi.fn(impl); vi.stubGlobal("fetch", f); return f; };
const sentBody = (f: ReturnType<typeof stub>) => JSON.parse(String(f.mock.calls.at(-1)![1].body));
const stored = () => JSON.parse(localStorage.getItem(JOURNAL_KEY)!) as { version: number; entries: JournalEntry[]; prayers: SavedPrayer[] };
afterEach(() => vi.unstubAllGlobals());

async function fillAndGenerate(user: ReturnType<typeof userEvent.setup>, text = "I am anxious about my exams and cannot sleep.") {
  await user.type(screen.getByLabelText(/on your heart/i), text);
  await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
  return await screen.findByRole("textbox", { name: /your prayer/i });
}

describe("submitting a prayer request", () => {
  it("sends the situation, chosen emotion, language and length to the API route and shows the result", async () => {
    const user = userEvent.setup();
    const f = stub(reply(success()));
    render(<PrayerView />);
    await user.type(screen.getByLabelText(/on your heart/i), "I am anxious about my exams.");
    await user.click(screen.getByRole("button", { name: "Anxious" }));
    await user.click(screen.getByRole("radio", { name: /tanglish/i }));
    await user.click(screen.getByRole("radio", { name: /more detailed/i }));
    await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
    expect(await screen.findByDisplayValue(PRAYER)).toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe("/api/prayer");
    expect(f.mock.calls[0][1].method).toBe("POST");
    expect(sentBody(f)).toEqual({ situation: "I am anxious about my exams.", emotion: "anxious", language: "tanglish", length: "detailed" });
  });
  it("the feeling is optional and can be toggled off; defaults are English and concise", async () => {
    const user = userEvent.setup();
    const f = stub(reply(success()));
    render(<PrayerView />);
    await user.click(screen.getByRole("button", { name: "Sad" }));
    expect(screen.getByRole("button", { name: "Sad" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Sad" }));
    expect(screen.getByRole("button", { name: "Sad" })).toHaveAttribute("aria-pressed", "false");
    await fillAndGenerate(user);
    expect(sentBody(f)).toEqual({ situation: "I am anxious about my exams and cannot sleep.", language: "en", length: "concise" });
  });
  it("offers all seven feelings and all three languages", () => {
    render(<PrayerView />);
    for (const n of ["Anxious", "Sad", "Grateful", "Lonely", "Confused", "Hopeful", "Spiritually distant"]) expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual(["en", "ta", "tanglish", "concise", "detailed"]);
  });
});

describe("input validation in the form", () => {
  it("blocks an empty or too-short request, shows a message, and does not call the API", async () => {
    const user = userEvent.setup();
    const f = stub(reply(success()));
    render(<PrayerView />);
    await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/tell us a little/i);
    await user.type(screen.getByLabelText(/on your heart/i), "short");
    await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 10/i);
    expect(screen.getByLabelText(/on your heart/i)).toHaveAttribute("aria-invalid", "true");
    expect(f).not.toHaveBeenCalled();
  });
  it("caps the request length and shows a counter", async () => {
    render(<PrayerView />);
    expect(screen.getByLabelText(/on your heart/i)).toHaveAttribute("maxlength", "2000");
    expect(screen.getByText("0 / 2000")).toBeInTheDocument();
  });
});

describe("Scripture is rendered separately from generated text", () => {
  it("shows verified quotations, paraphrases and notes in their own region, outside the prayer editor", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    const editor = await fillAndGenerate(user);

    const prayerRegion = screen.getByTestId("prayer-region");
    const scriptureRegion = screen.getByTestId("scripture-region");
    expect(prayerRegion.contains(scriptureRegion)).toBe(false);
    expect(scriptureRegion.contains(editor)).toBe(false);

    const card = within(scriptureRegion).getByRole("article", { name: "Philippians 4:6–7" });
    expect(within(card).getByText(/verified scripture · kjv/i)).toBeInTheDocument();
    expect(within(card).getByTestId("scripture-quote").textContent).toBe(getPassage("phil-4-6-7")!.verses.map((v) => v.text).join(" "));
    expect(within(card).getByTestId("scripture-quote").tagName).toBe("BLOCKQUOTE");
    expect(within(card).getByText(/a paraphrase, not a quotation/i)).toBeInTheDocument();
    expect(within(card).getByTestId("scripture-paraphrase")).toHaveTextContent(getPassage("phil-4-6-7")!.plain);
    expect(within(card).getByText(/AI-written note/i)).toBeInTheDocument();
    expect(within(card).getByTestId("scripture-why")).toHaveTextContent("It speaks right to exam worry.");
    expect(within(scriptureRegion).getByRole("article", { name: "1 Peter 5:7" })).toHaveTextContent(/curated note/i);

    // Quotations never leak into the editable prayer, and the prayer is labelled as AI-generated and not from God.
    expect((editor as HTMLTextAreaElement).value).not.toContain("Be careful for nothing");
    expect(within(prayerRegion).getByText("AI-generated")).toBeInTheDocument();
    expect(screen.getByTestId("ai-notice")).toHaveTextContent(/not a message from God/i);
    expect(screen.getByTestId("ai-notice")).toHaveTextContent(/can't promise any outcome/i);
  });
  it("says so plainly when no verified passage fits, instead of showing one", async () => {
    const user = userEvent.setup();
    stub(reply(success({ scripture: [], scriptureNote: "We couldn't find a verified passage in our current collection that fits." })));
    render(<PrayerView />);
    await fillAndGenerate(user);
    expect(screen.getByTestId("no-scripture")).toHaveTextContent(/couldn't find a verified passage/i);
    expect(screen.queryAllByTestId("scripture-quote")).toHaveLength(0);
  });
  it("notes that Scripture stays in English for Tamil and Tanglish prayers", async () => {
    const user = userEvent.setup();
    stub(reply(success({ prayerLanguage: "ta" })));
    render(<PrayerView />);
    await user.click(screen.getByRole("radio", { name: /tamil/i }));
    await fillAndGenerate(user);
    expect(screen.getByTestId("scripture-region")).toHaveTextContent(/shown in English \(King James Version\)/);
  });
  it("shows the support notice, with the not-a-pastor-or-therapist statement, when the server flags one", async () => {
    const user = userEvent.setup();
    stub(reply(success({ safety: { level: "support", message: "Please contact local emergency services. This app is not a pastor, therapist or emergency service." } })));
    render(<PrayerView />);
    await fillAndGenerate(user, "I feel hopeless and want to die.");
    expect(screen.getByTestId("safety-notice")).toHaveTextContent(/not a pastor, therapist or emergency service/i);
  });
  it("includes a standing disclaimer that outcomes are not promised", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    await fillAndGenerate(user);
    expect(screen.getByText(/not a pastor, counsellor, therapist or emergency service/i)).toBeInTheDocument();
  });
});

describe("API errors and missing credentials", () => {
  it("missing API key: still shows verified Scripture, explains, and lets the person write their own prayer", async () => {
    const user = userEvent.setup();
    stub(reply(success({ prayer: null, degraded: { code: "not_configured", message: "Prayer writing isn't set up on this server yet, so here is Scripture to pray with." } })));
    render(<PrayerView />);
    const editor = await fillAndGenerate(user);
    expect(screen.getByTestId("prayer-degraded")).toHaveAttribute("data-code", "not_configured");
    expect(screen.getByTestId("prayer-degraded")).toHaveTextContent(/isn't set up on this server/);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-notice")).not.toBeInTheDocument();     // nothing AI-generated to label
    expect(screen.getAllByTestId("scripture-quote").length).toBe(2);
    expect(editor).toHaveValue("");
    expect(screen.getByRole("button", { name: /^save prayer$/i })).toBeDisabled();
    await user.type(editor, "Lord, I am tired. Help me. Amen.");
    await user.click(screen.getByRole("button", { name: /^save prayer$/i }));
    expect(stored().prayers[0]).toMatchObject({ text: "Lord, I am tired. Help me. Amen.", origin: "written" });
    expect(screen.getByText("Written by you")).toBeInTheDocument();
  });
  it("rate limit from the AI service: friendly message with wait time and a retry that works", async () => {
    const user = userEvent.setup();
    let n = 0;
    const f = stub(async () => new Response(JSON.stringify(n++ === 0
      ? success({ prayer: null, degraded: { code: "rate_limited", message: "The prayer service is busy right now.", retryAfterSeconds: 20 } })
      : success())));
    render(<PrayerView />);
    await fillAndGenerate(user);
    expect(screen.getByTestId("prayer-degraded")).toHaveTextContent(/busy right now\. Please try again in about 20 seconds/);
    await user.click(screen.getByRole("button", { name: /^try again$/i }));
    expect(await screen.findByDisplayValue(PRAYER)).toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("prayer-degraded")).not.toBeInTheDocument();
  });
  it("our own rate limiter (HTTP 429): shows the wait time", async () => {
    const user = userEvent.setup();
    stub(reply({ ok: false, code: "rate_limited", message: "You're sending requests quickly.", retryAfterSeconds: 1 }, 429));
    render(<PrayerView />);
    await fillAndGenerate(user).catch(() => {});
    expect(await screen.findByTestId("prayer-error")).toHaveTextContent(/sending requests quickly\. Please try again in about 1 second\./);
  });
  it("network failure: friendly message, and the form keeps what the person typed", async () => {
    const user = userEvent.setup();
    stub(async () => { throw new TypeError("Failed to fetch"); });
    render(<PrayerView />);
    await user.type(screen.getByLabelText(/on your heart/i), "I am anxious about my exams.");
    await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
    expect(await screen.findByTestId("prayer-error")).toHaveAttribute("data-code", "network");
    expect(screen.getByTestId("prayer-error")).toHaveTextContent(/couldn't connect/i);
    expect(screen.getByLabelText(/on your heart/i)).toHaveValue("I am anxious about my exams.");
  });
  it("server error with a non-JSON body (invalid response): friendly message, no crash", async () => {
    const user = userEvent.setup();
    stub(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    render(<PrayerView />);
    await user.type(screen.getByLabelText(/on your heart/i), "I am anxious about my exams.");
    await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
    expect(await screen.findByTestId("prayer-error")).toHaveTextContent(/something went wrong/i);
  });
  it("server-side validation failure is shown without a retry button", async () => {
    const user = userEvent.setup();
    stub(reply({ ok: false, code: "invalid_input", message: "Please check your request and try again." }, 400));
    render(<PrayerView />);
    await user.type(screen.getByLabelText(/on your heart/i), "I am anxious about my exams.");
    await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
    expect(await screen.findByTestId("prayer-error")).toHaveTextContent(/check your request/i);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });
  it("a failed regenerate keeps the current prayer and Scripture", async () => {
    const user = userEvent.setup();
    let n = 0;
    stub(async () => new Response(JSON.stringify(n++ === 0 ? success() : success({ prayer: null, degraded: { code: "network", message: "We couldn't reach the prayer service." } }))));
    render(<PrayerView />);
    await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    expect(await screen.findByTestId("prayer-degraded")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /your prayer/i })).toHaveValue(PRAYER);
  });
});

describe("edit, regenerate, copy", () => {
  it("regenerates with the same settings and replaces the text when nothing was edited", async () => {
    const user = userEvent.setup();
    let n = 0;
    const f = stub(async () => new Response(JSON.stringify(success({ prayer: n++ === 0 ? PRAYER : "A second, different prayer. Amen." }))));
    render(<PrayerView />);
    await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    expect(await screen.findByDisplayValue("A second, different prayer. Amen.")).toBeInTheDocument();
    expect(JSON.stringify(sentBody(f))).toBe(JSON.stringify({ situation: "I am anxious about my exams and cannot sleep.", language: "en", length: "concise" }));
  });
  it("asks before regenerating over the person's edits, and keeps them if they say no", async () => {
    const user = userEvent.setup();
    const f = stub(reply(success()));
    render(<PrayerView />);
    const editor = await fillAndGenerate(user);
    await user.type(editor, " Thank you.");
    expect(screen.getByText("AI-generated · edited by you")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    expect(screen.getByRole("alertdialog", { name: /confirm regenerate/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /keep my edits/i }));
    expect(f).toHaveBeenCalledTimes(1);
    expect(editor).toHaveValue(PRAYER + " Thank you.");
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await user.click(screen.getByRole("button", { name: /yes, regenerate/i }));
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("copies the prayer text to the clipboard", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    const editor = await fillAndGenerate(user);
    await user.type(editor, " Amen again.");
    await user.click(screen.getByRole("button", { name: /copy prayer/i }));
    expect(await navigator.clipboard.readText()).toBe(PRAYER + " Amen again.");
    expect(await screen.findByText(/prayer copied/i)).toBeInTheDocument();
  });
  it("shows a helpful message if copying is blocked", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    await fillAndGenerate(user);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await user.click(screen.getByRole("button", { name: /copy prayer/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't copy/i);
  });
});

describe("saving and editing prayers", () => {
  it("saves privately with a stable id, timestamps, and Scripture references; shows it in the saved list", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    await user.type(screen.getByLabelText(/on your heart/i), "I am anxious about my exams.");
    await user.click(screen.getByRole("button", { name: "Anxious" }));
    await user.click(screen.getByRole("button", { name: /^generate prayer$/i }));
    await screen.findByRole("textbox", { name: /your prayer/i });
    expect(localStorage.getItem(JOURNAL_KEY)).toBeNull();             // nothing is stored until the person chooses to save
    await user.click(screen.getByRole("button", { name: /^save prayer$/i }));
    expect(await screen.findByText(/saved privately on this device/i)).toBeInTheDocument();
    const s = stored();
    expect(s.version).toBe(2);
    expect(s.prayers).toHaveLength(1);
    const p = s.prayers[0];
    expect(p).toMatchObject({ situation: "I am anxious about my exams.", emotion: "anxious", language: "en", length: "concise", text: PRAYER, origin: "ai" });
    expect(p.id).toMatch(/\S{8,}/);
    expect(Date.parse(p.createdAt)).not.toBeNaN(); expect(Date.parse(p.updatedAt)).not.toBeNaN();
    expect(p.scripture.map((x) => x.ref)).toEqual(["Philippians 4:6–7", "1 Peter 5:7"]);
    const list = screen.getByRole("region", { name: /my saved prayers/i });
    expect(within(list).getByText(/Philippians 4:6–7 · 1 Peter 5:7/)).toBeInTheDocument();
  });
  it("editing then saving again updates the same record, marks it edited, and never duplicates", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    const editor = await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /^save prayer$/i }));
    const first = stored().prayers[0];
    await user.type(editor, " I trust you.");
    expect(screen.getByRole("button", { name: /update saved prayer/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /update saved prayer/i }));
    const after = stored().prayers;
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ id: first.id, createdAt: first.createdAt, text: PRAYER + " I trust you.", origin: "edited" });
  });
  it("reopens a saved prayer (from the list), lets the person edit the request and prayer, and saves in place", async () => {
    const user = userEvent.setup();
    saveStore({ entries: [], prayers: [normalizePrayer({ id: "p1", createdAt: "2026-10-01T10:00:00.000Z", situation: "Old request text here", emotion: "sad", language: "en", length: "concise", text: "Old prayer. Amen.", origin: "ai", scripture: [phil] })] });
    render(<PrayerView />);
    await user.click(await screen.findByRole("button", { name: /open & edit/i }));
    expect(screen.getByLabelText(/on your heart/i)).toHaveValue("Old request text here");
    expect(screen.getByRole("button", { name: "Sad" })).toHaveAttribute("aria-pressed", "true");
    const editor = screen.getByRole("textbox", { name: /your prayer/i });
    expect(editor).toHaveValue("Old prayer. Amen.");
    expect(within(screen.getByTestId("scripture-region")).getByText("Philippians 4:6–7")).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/on your heart/i));
    await user.type(screen.getByLabelText(/on your heart/i), "A corrected request");
    await user.clear(editor); await user.type(editor, "New words. Amen.");
    await user.click(screen.getByRole("button", { name: /update saved prayer/i }));
    expect(stored().prayers).toHaveLength(1);
    expect(stored().prayers[0]).toMatchObject({ id: "p1", situation: "A corrected request", text: "New words. Amen.", origin: "edited", createdAt: "2026-10-01T10:00:00.000Z" });
  });
  it("opens a prayer directly from a link (?id=)", async () => {
    saveStore({ entries: [], prayers: [normalizePrayer({ id: "deep", situation: "Deep link request", text: "Deep linked prayer. Amen.", origin: "written" })] });
    render(<PrayerView initialId="deep" />);
    expect(await screen.findByDisplayValue("Deep linked prayer. Amen.")).toBeInTheDocument();
  });
  it("deletes a saved prayer only after confirmation", async () => {
    const user = userEvent.setup();
    saveStore({ entries: [], prayers: [normalizePrayer({ id: "p1", situation: "Request one", text: "Prayer one. Amen." }), normalizePrayer({ id: "p2", situation: "Request two", text: "Prayer two. Amen." })] });
    render(<PrayerView />);
    const first = (await screen.findAllByRole("button", { name: /^delete$/i }))[0];
    await user.click(first);
    await user.click(screen.getByRole("button", { name: /keep it/i }));
    expect(stored().prayers).toHaveLength(2);
    await user.click((await screen.findAllByRole("button", { name: /^delete$/i }))[0]);
    await user.click(screen.getByRole("button", { name: /yes, delete$/i }));
    expect(stored().prayers).toHaveLength(1);
  });
  it("offers data controls: download and delete-all with confirmation", async () => {
    const user = userEvent.setup();
    saveStore({ entries: [], prayers: [normalizePrayer({ id: "p1", text: "Prayer one. Amen." }), normalizePrayer({ id: "p2", text: "Prayer two. Amen." })] });
    render(<PrayerView />);
    expect(await screen.findByRole("button", { name: /download my journal & prayers/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /delete all saved prayers/i }));
    await user.click(screen.getByRole("button", { name: /keep them/i }));
    expect(stored().prayers).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /delete all saved prayers/i }));
    await user.click(screen.getByRole("button", { name: /yes, delete all/i }));
    expect(stored().prayers).toHaveLength(0);
  });
  it("reports a storage failure instead of pretending the prayer was saved", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    await fillAndGenerate(user);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await user.click(screen.getByRole("button", { name: /^save prayer$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save this on your device/i);
    expect(screen.queryByText(/saved privately/i)).not.toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("saving a prayer to My Walk with God", () => {
  const V1_ENTRY = { id: "old-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", source: "lesson", lessonId: "genesis-1", bookSlug: "genesis", chapter: 1,
    lessonTitle: "In the Beginning", ref: "Genesis 1:1–5", guided: { god: "He creates", self: "", apply: "", pray: "" }, lessonReflections: [], notes: "keep me", tags: ["creation"], favorite: true, reviews: [] };

  it("creates one linked journal entry (saving the prayer too) without touching existing entries", async () => {
    const user = userEvent.setup();
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ version: 1, entries: [V1_ENTRY] }));
    stub(reply(success()));
    render(<PrayerView />);
    await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /save to my walk with god/i }));
    expect(await screen.findByText(/saved to my walk with god/i)).toBeInTheDocument();
    const s = stored();
    expect(s.version).toBe(2);
    expect(s.entries).toHaveLength(2);
    expect(s.prayers).toHaveLength(1);
    const entry = s.entries.find((e) => e.prayerId)!;
    expect(entry).toMatchObject({ source: "prayer", prayerId: s.prayers[0].id, ref: "Philippians 4:6–7; 1 Peter 5:7" });
    expect(entry.guided.pray).toBe(PRAYER);
    expect(s.prayers[0].journalEntryId).toBe(entry.id);
    expect(s.entries.find((e) => e.id === "old-1")).toMatchObject({ notes: "keep me", favorite: true, tags: ["creation"], lessonTitle: "In the Beginning", ref: "Genesis 1:1–5" });
    expect(screen.getByRole("link", { name: /open entry/i })).toHaveAttribute("href", `/journal/edit?id=${entry.id}`);
  });
  it("saving again updates the same entry (button becomes 'Update journal entry') and never duplicates", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    const editor = await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /save to my walk with god/i }));
    const id = stored().entries[0].id;
    await user.type(editor, " Edited later.");
    await user.click(screen.getByRole("button", { name: /update journal entry/i }));
    expect(await screen.findByText(/journal entry has been updated/i)).toBeInTheDocument();
    expect(stored().entries).toHaveLength(1);
    expect(stored().prayers).toHaveLength(1);
    expect(stored().entries[0].id).toBe(id);
    expect(stored().entries[0].guided.pray).toBe(PRAYER + " Edited later.");
    expect(stored().prayers[0].text).toBe(PRAYER + " Edited later.");
  });
  it("the entry appears in My Walk with God, marked as a prayer, and links back to the prayer", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    const first = render(<PrayerView />);
    await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /save to my walk with god/i }));
    first.unmount();
    const hist = render(<JournalHistory />);
    const card = await screen.findByRole("article", { name: /a prayer for my situation/i });
    expect(within(card).getByText("Prayer")).toBeInTheDocument();
    expect(within(card).getByText("Philippians 4:6–7; 1 Peter 5:7")).toBeInTheDocument();
    expect(within(card).getByText(/worry about my exams/i)).toBeInTheDocument();
    hist.unmount();
    render(<JournalEditor id={stored().entries[0].id} />);
    expect(await screen.findByRole("link", { name: /view this prayer/i })).toHaveAttribute("href", `/pray?id=${stored().prayers[0].id}`);
    expect(screen.getByLabelText(/what do i want to pray about/i)).toHaveValue(PRAYER);
  });
  it("deleting the journal entry from the journal leaves the prayer, now unlinked, and the button offers to save again", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    const first = render(<PrayerView />);
    await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /save to my walk with god/i }));
    first.unmount();
    render(<JournalHistory />);
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /yes, delete$/i }));
    expect(stored().entries).toHaveLength(0);
    expect(stored().prayers).toHaveLength(1);
    expect(stored().prayers[0].journalEntryId).toBeUndefined();
  });
  it("deleting a linked prayer lets the person choose whether the journal entry goes too", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    const first = render(<PrayerView />);
    await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /save to my walk with god/i }));
    first.unmount();
    render(<PrayerView />);
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /delete prayer only/i }));
    expect(stored().prayers).toHaveLength(0);
    expect(stored().entries).toHaveLength(1);
    expect(stored().entries[0].prayerId).toBeUndefined();
  });
  it("deleting a linked prayer together with its journal entry removes both", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    const first = render(<PrayerView />);
    await fillAndGenerate(user);
    await user.click(screen.getByRole("button", { name: /save to my walk with god/i }));
    first.unmount();
    render(<PrayerView />);
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /delete prayer and journal entry/i }));
    expect(stored().prayers).toHaveLength(0);
    expect(stored().entries).toHaveLength(0);
  });
  it("reports a storage failure when saving to the journal", async () => {
    const user = userEvent.setup();
    stub(reply(success()));
    render(<PrayerView />);
    await fillAndGenerate(user);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await user.click(screen.getByRole("button", { name: /save to my walk with god/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save this on your device/i);
    spy.mockRestore();
  });
});
