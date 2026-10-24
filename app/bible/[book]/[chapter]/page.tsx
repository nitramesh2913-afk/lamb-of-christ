import { notFound } from "next/navigation";
import { LESSONS, getLesson } from "@/lib/lessons";
import { LessonView } from "@/components/LessonView";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ book: l.book, chapter: String(l.chapter) }));
}
export const dynamicParams = false;

export default async function LessonPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  const lesson = getLesson(book, Number(chapter));
  if (!lesson) notFound();
  const i = LESSONS.indexOf(lesson);
  const next = LESSONS[i + 1];
  return <LessonView lesson={lesson} nextHref={next ? `/bible/${next.book}/${next.chapter}` : null} />;
}
