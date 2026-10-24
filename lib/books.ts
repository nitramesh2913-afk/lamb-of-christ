// SAMPLE CONTENT for development. Progress values are placeholder data until
// database-backed progress arrives in a later stage.
export type BookStatus = "complete" | "current" | "next" | "locked";

export interface Book {
  slug: string;
  title: string;
  blurb: string;
  themes: string[];
  chapters: number;
  done: number; // sample progress
  status: BookStatus;
  art: "genesis" | "exodus" | "psalms" | "proverbs" | "gospels" | "acts";
  tint: string;
}

export const BOOKS: Book[] = [
  { slug: "genesis", title: "Genesis", blurb: "Creation, Adam and Eve, Noah, Abraham, Joseph.", themes: ["Creation", "Noah", "Abraham", "Joseph"], chapters: 50, done: 0, status: "current", art: "genesis", tint: "#dbeacb" },
  { slug: "exodus", title: "Exodus", blurb: "Moses, the Exodus, the Ten Commandments.", themes: ["Moses", "The Exodus", "Ten Commandments"], chapters: 40, done: 0, status: "next", art: "exodus", tint: "#d6e6f0" },
  { slug: "psalms", title: "Psalms", blurb: "Prayer, worship, comfort, and trust.", themes: ["Prayer", "Worship", "Comfort", "Trust"], chapters: 150, done: 0, status: "next", art: "psalms", tint: "#f4e6bf" },
  { slug: "proverbs", title: "Proverbs", blurb: "Wisdom for everyday decisions.", themes: ["Wisdom", "Decisions"], chapters: 31, done: 0, status: "locked", art: "proverbs", tint: "#ecdcc6" },
  { slug: "gospels", title: "The Gospels", blurb: "The life and teachings of Jesus.", themes: ["Jesus", "Parables", "Teachings"], chapters: 89, done: 0, status: "locked", art: "gospels", tint: "#e3ecd2" },
  { slug: "acts", title: "Acts", blurb: "The early church and the apostles.", themes: ["Early church", "Apostles"], chapters: 28, done: 0, status: "locked", art: "acts", tint: "#f3dcc9" },
];

export const STATUS_LABEL: Record<BookStatus, string> = {
  complete: "Completed",
  current: "Where you are now",
  next: "Ready when you are",
  locked: "Opens as you walk — preview anytime",
};

// Daily verse: King James Version (public domain).
export const DAILY_VERSE = {
  text: "Thy word is a lamp unto my feet, and a light unto my path.",
  ref: "Psalm 119:105",
  translation: "KJV",
};

export const getBook = (slug: string) => BOOKS.find((b) => b.slug === slug);
