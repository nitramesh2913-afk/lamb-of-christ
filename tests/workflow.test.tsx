import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }), usePathname: () => "/" }));

import { LessonView } from "@/components/LessonView";
import { JournalHistory } from "@/components/JournalHistory";
import { JournalEditor } from "@/components/JournalEditor";
import { ReviewView } from "@/components/ReviewView";
import { ChapterGrid } from "@/components/ChapterGrid";
import { getBook } from "@/lib/books";
import { getLesson } from "@/lib/lessons";
import { JOURNAL_BACKUP_KEY, JOURNAL_KEY, JournalEntry, loadEntries } from "@/lib/journal";

const genesis = getLesson("genesis", 1)!;
const stored = (): JournalEntry[] => JSON.parse(localStorage.getItem(JOURNAL_KEY)!).entries;

async function readAndTransfer(user: ReturnType<typeof userEvent.setup>, answer = "God is a creator who speaks light into darkness.") {
  render(<LessonView lesson={genesis} nextHref={null} />);
  await user.type(screen.getAllByRole("textbox")[0], answer);
  await user.click(screen.getByRole("button", { name: /mark lesson complete/i }));
  await user.click(screen.getByRole("button", { name: /save to my journal/i }));
}

describe("reading -> journal workflow", () => {
  it("transfers saved reflection answers with title and reference attached, then navigates to the entry", async () => {
    const user = userEvent.setup();
    await readAndTransfer(user);
    const entries = stored();
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(e.id).toMatch(/\S{8,}/);
    expect(e.lessonTitle).toBe("In the Beginning");
    expect(e.ref).toBe("Genesis 1:1–5");
    expect(e.lessonId).toBe("genesis-1");
    expect(e.lessonReflections[0].answer).toBe("God is a creator who speaks light into darkness.");
    expect(push).toHaveBeenCalledWith(`/journal/edit?id=${e.id}`);
  });

  it("does not duplicate on a second transfer and keeps the same id", async () => {
    const user = userEvent.setup();
    await readAndTransfer(user);
    const id = stored()[0].id;
    await user.click(screen.getByRole("button", { name: /update my journal entry/i }));
    expect(stored()).toHaveLength(1);
    expect(stored()[0].id).toBe(id);
  });

  it("persists after a refresh (remount) and shows in history, while Stage 2 progress is intact", async () => {
    const user = userEvent.setup();
    await readAndTransfer(user);
    document.body.innerHTML = "";
    const { unmount } = render(<JournalHistory />);
    expect(await screen.findByText("In the Beginning")).toBeInTheDocument();
    expect(screen.getByText("Genesis 1:1–5")).toBeInTheDocument();
    unmount();
    const progress = JSON.parse(localStorage.getItem("loc.progress.v1")!);
    expect(progress.completed["genesis-1"]).toBe(true);
    expect(progress.answers["genesis-1"][0]).toMatch(/creator/);
    render(<ChapterGrid book={getBook("genesis")!} />);
    expect(screen.getByRole("link", { name: /chapter 1: in the beginning, completed/i })).toBeInTheDocument();
  });

  it("edits guided answers in the editor and they persist across remount", async () => {
    const user = userEvent.setup();
    await readAndTransfer(user);
    const id = stored()[0].id;
    document.body.innerHTML = "";
    const first = render(<JournalEditor id={id} />);
    await user.type(await screen.findByLabelText(/what did i learn about god/i), "He is good.");
    await user.type(screen.getByLabelText(/how can i apply this today/i), "Notice one good thing.");
    await user.type(screen.getByLabelText("Add a topic"), "gratitude");
    await user.click(screen.getByRole("button", { name: /add topic/i }));
    await user.click(screen.getByRole("button", { name: /save entry/i }));
    expect(await screen.findByText(/saved privately/i)).toBeInTheDocument();
    first.unmount();
    render(<JournalEditor id={id} />);
    expect(await screen.findByLabelText(/what did i learn about god/i)).toHaveValue("He is good.");
    expect(screen.getByText("gratitude")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/creator who speaks light/)).toBeInTheDocument(); // carried-over answer
    expect(stored()[0].id).toBe(id);
  });

  it("searches, filters by book, favorites and deletes with confirmation", async () => {
    const user = userEvent.setup();
    await readAndTransfer(user);
    document.body.innerHTML = "";
    render(<JournalHistory />);
    await screen.findByText("In the Beginning");
    await user.type(screen.getByLabelText(/search my journal/i), "zzzz-nothing");
    expect(screen.getByTestId("no-matches")).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/search my journal/i));
    await user.type(screen.getByLabelText(/search my journal/i), "genesis"); // matches Scripture reference
    expect(screen.getByText("In the Beginning")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/filter by bible book/i), "psalms");
    expect(screen.getByTestId("no-matches")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    await user.click(screen.getByRole("button", { name: /add to favorites/i }));
    expect(stored()[0].favorite).toBe(true);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /keep it/i }));
    expect(stored()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /yes, delete$/i }));
    expect(stored()).toHaveLength(0);
    expect(await screen.findByTestId("empty-journal")).toBeInTheDocument();
  });

  it("shows proper empty states for history and review", async () => {
    render(<JournalHistory />);
    expect(await screen.findByTestId("empty-journal")).toBeInTheDocument();
    document.body.innerHTML = "";
    render(<ReviewView />);
    expect(await screen.findByTestId("empty-review")).toBeInTheDocument();
  });

  it("review shows what the user wrote, asks a lesson question, and records the review", async () => {
    const user = userEvent.setup();
    await readAndTransfer(user);
    document.body.innerHTML = "";
    render(<ReviewView />);
    const card = await screen.findByRole("article", { name: /review in the beginning/i });
    expect(within(card).getByText(/creator who speaks light/)).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: /^God/ }));
    expect(await within(card).findByText(/Well done/)).toBeInTheDocument();
    expect(stored()[0].reviews).toHaveLength(1);
    expect(stored()[0].reviews[0].correct).toBe(true);
  });

  it("a free entry can be created without a lesson and keeps no Scripture reference", async () => {
    const user = userEvent.setup();
    render(<JournalEditor id="new" />);
    await user.type(await screen.findByLabelText(/what do i want to pray about/i), "Peace for this week.");
    await user.click(screen.getByRole("button", { name: /save entry/i }));
    expect(stored()).toHaveLength(1);
    expect(stored()[0].source).toBe("free");
    expect(stored()[0].ref).toBeUndefined();
  });
});

describe("storage safety and migration", () => {
  it("loads a legacy bare-array journal and upgrades it", () => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify([{ id: "old-1", createdAt: "2026-01-01T00:00:00.000Z", notes: "hello" }]));
    const e = loadEntries();
    expect(e[0].id).toBe("old-1");
    expect(e[0].guided.god).toBe("");
    expect(e[0].tags).toEqual([]);
  });
  it("never wipes unreadable data: keeps a backup and does not crash", () => {
    localStorage.setItem(JOURNAL_KEY, "{not json");
    expect(loadEntries()).toEqual([]);
    expect(localStorage.getItem(JOURNAL_BACKUP_KEY)).toBe("{not json");
  });
});
