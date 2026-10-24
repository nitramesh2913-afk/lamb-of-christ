"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PrayerView } from "@/components/PrayerView";

function Inner() {
  const id = useSearchParams().get("id") ?? undefined;
  return <PrayerView initialId={id} />;
}
export default function Pray() {
  return <Suspense fallback={<p role="status">Loading…</p>}><Inner /></Suspense>;
}
