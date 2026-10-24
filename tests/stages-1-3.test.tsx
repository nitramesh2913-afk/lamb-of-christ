// Regression guard for Stages 1-3: pages, navigation and content that existed before Stage 4 must still work.
// (The Stage 2/3 reading -> journal workflow is covered in depth by tests/workflow.test.tsx, which is unchanged.)
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(),
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));

import Home from "@/app/page";
import BibleExplorer from "@/app/bible/page";
import BookPage, { generateStaticParams as bookParams } from "@/app/bible/[book]/page";
import LessonPage, { generateStaticParams as lessonParams } from "@/app/bible/[book]/[chapter]/page";
import Journey from "@/app/journey/page";
import JournalPage from "@/app/journal/page";
import { Nav } from "@/components/Nav";
import { LessonView } from "@/components/LessonView";
import { BOOKS, DAILY_VERSE } from "@/lib/books";
import { LESSONS, getLesson } from "@/lib/lessons";
import { JOURNAL_KEY } from "@/lib/journal";

describe("Stage 1: navigation and pages", () => {
  it("keeps all five destinations in both the sidebar and the mobile bar, and marks the current page", () => {
    pathname = "/pray";
    render(<Nav />);
    const navs = screen.getAllByRole("navigation", { name: "Primary" });
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      const links = within(nav).getAllByRole("link").filter((l) => l.getAttribute("href") !== "/" || /home/i.test(l.textContent ?? ""));
      expect(links.map((l) => l.getAttribute("href"))).toEqual(["/", "/bible", "/pray", "/journal", "/journey"]);
      expect(within(nav).getByRole("link", { name: /pray/i })).toHaveAttribute("aria-current", "page");
      expect(within(nav).getByRole("link", { name: /home/i })).not.toHaveAttribute("aria-current");
    }
  });
  it("home shows the welcome, the daily verse, progress and every book on the map", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: /walk daily on the bible way/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(DAILY_VERSE.text.slice(0, 20)))).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /journey progress/i })).toBeInTheDocument();
    for (const b of BOOKS) expect(screen.getAllByText(b.title).length).toBeGreaterThan(0);
  });
  it("the Bible explorer lists all six books", () => {
    render(<BibleExplorer />);
    expect(screen.getByRole("heading", { level: 1, name: "Bible" })).toBeInTheDocument();
    for (const b of BOOKS) expect(screen.getAllByText(b.title).length).toBeGreaterThan(0);
  });
  it("book pages render for every book, and an unknown book is a 404", async () => {
    expect(bookParams().map((p) => p.book)).toEqual(BOOKS.map((b) => b.slug));
    for (const b of BOOKS) {
      const { unmount } = render(await BookPage({ params: Promise.resolve({ book: b.slug }) }));
      expect(screen.getByRole("heading", { level: 1, name: b.title })).toBeInTheDocument();
      unmount();
    }
    await expect(BookPage({ params: Promise.resolve({ book: "nope" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("My Journey provides account and database setup", () => {
    render(<Journey />);
    expect(screen.getByRole("heading", { level: 1, name: "My account" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Account service not configured" })).toBeInTheDocument();
  });
});

describe("Stage 2: lessons", () => {
  it("every lesson route renders its KJV text, level explanations and quiz", async () => {
    expect(lessonParams()).toHaveLength(LESSONS.length);
    for (const l of LESSONS) {
      const { unmount } = render(await LessonPage({ params: Promise.resolve({ book: l.book, chapter: String(l.chapter) }) }));
      expect(screen.getByRole("heading", { level: 1, name: l.title })).toBeInTheDocument();
      expect(screen.getByText(l.verses[0].text)).toBeInTheDocument();
      unmount();
    }
    await expect(LessonPage({ params: Promise.resolve({ book: "genesis", chapter: "49" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("answering a quiz question gives feedback, and lesson progress is saved to the Stage 2 key", async () => {
    const user = userEvent.setup();
    const lesson = getLesson("psalms", 23)!;
    render(<LessonView lesson={lesson} nextHref={null} />);
    await user.click(screen.getAllByRole("button", { name: new RegExp(lesson.quiz[0].options[lesson.quiz[0].answer]) })[0]);
    expect(await screen.findByText(/well done/i)).toBeInTheDocument();
    await user.type(screen.getAllByRole("textbox")[0], "He restores me.");
    await user.click(screen.getByRole("button", { name: /mark lesson complete/i }));
    const progress = JSON.parse(localStorage.getItem("loc.progress.v1")!);
    expect(progress.completed["psalms-23"]).toBe(true);
    expect(progress.answers["psalms-23"][0]).toBe("He restores me.");
  });
});

describe("Stage 3: journal page and Stage 4 data does not disturb it", () => {
  it("the journal route renders its empty state", async () => {
    render(<JournalPage />);
    expect(await screen.findByTestId("empty-journal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /my walk with god/i })).toBeInTheDocument();
  });
  it("an existing v1 journal still lists, searches, favourites and exports exactly as before, and keeps its stored shape until the next write", async () => {
    const user = userEvent.setup();
    const v1 = { version: 1, entries: [{ id: "old-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", source: "lesson", lessonId: "genesis-1", bookSlug: "genesis", chapter: 1,
      lessonTitle: "In the Beginning", ref: "Genesis 1:1–5", guided: { god: "", self: "", apply: "", pray: "" }, lessonReflections: [{ prompt: "p", answer: "my answer" }], notes: "", tags: [], favorite: false, reviews: [] }] };
    const original = JSON.stringify(v1);
    localStorage.setItem(JOURNAL_KEY, original);
    render(<JournalPage />);
    expect(await screen.findByText("In the Beginning")).toBeInTheDocument();
    expect(screen.queryByText("Prayer")).not.toBeInTheDocument();                // lesson entries are not mislabelled
    expect(screen.getByRole("button", { name: /download my journal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete all entries/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/search my journal/i), "genesis");
    expect(screen.getByText("In the Beginning")).toBeInTheDocument();
    expect(localStorage.getItem(JOURNAL_KEY)).toBe(original);                    // reading changed nothing
    await user.click(screen.getByRole("button", { name: /add to favorites/i }));
    const after = JSON.parse(localStorage.getItem(JOURNAL_KEY)!);
    expect(after.entries[0]).toMatchObject({ id: "old-1", favorite: true, lessonReflections: [{ prompt: "p", answer: "my answer" }] });
    expect(after.prayers).toEqual([]);
  });
  it("delete-all-entries still works and still only touches entries", async () => {
    const user = userEvent.setup();
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ version: 2, entries: [{ id: "e1", notes: "hello", createdAt: "2026-01-01T00:00:00.000Z" }], prayers: [{ id: "p1", text: "Kept prayer. Amen." }] }));
    render(<JournalPage />);
    await user.click(await screen.findByRole("button", { name: /delete all entries/i }));
    await user.click(screen.getByRole("button", { name: /yes, delete all/i }));
    const s = JSON.parse(localStorage.getItem(JOURNAL_KEY)!);
    expect(s.entries).toEqual([]);
    expect(s.prayers.map((p: { id: string }) => p.id)).toEqual(["p1"]);
  });
});

describe("Stage 4 entry point", () => {
  it("the Pray page is no longer a placeholder", async () => {
    const Pray = (await import("@/app/pray/page")).default;
    render(<Pray />);
    expect(await screen.findByRole("heading", { level: 1, name: /pray for my situation/i })).toBeInTheDocument();
    expect(screen.queryByText(/planned for/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^generate prayer$/i })).toBeInTheDocument();
  });
});
