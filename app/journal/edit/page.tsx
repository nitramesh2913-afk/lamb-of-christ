"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { JournalEditor } from "@/components/JournalEditor";

function Inner() {
  const id = useSearchParams().get("id") ?? "new";
  return <JournalEditor key={id} id={id} />;
}
export default function EditPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><Inner /></Suspense>;
}
