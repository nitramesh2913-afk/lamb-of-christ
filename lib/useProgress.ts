"use client";
import { useCallback, useEffect, useState } from "react";
import { LOCAL_REFRESH_EVENT, recordLocalChange } from "./account/localSync";

// Stage 2: progress is stored in this browser (localStorage). Stage 5 moves it to the database.
const KEY = "loc.progress.v1";
export interface ProgressState {
  completed: Record<string, boolean>;
  answers: Record<string, string[]>; // reflection answers per lesson
  level: "beginner" | "intermediate" | "indepth";
}
const EMPTY: ProgressState = { completed: {}, answers: {}, level: "beginner" };

function read(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch { return EMPTY; }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read()); setReady(true);
    const on = (e: StorageEvent) => { if (e.key === KEY) setState(read()); };
    const refresh = () => setState(read());
    window.addEventListener("storage", on);
    window.addEventListener(LOCAL_REFRESH_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener(LOCAL_REFRESH_EVENT, refresh);
    };
  }, []);

  const update = useCallback((fn: (s: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        const progressKeys: string[] = [];
        if (prev.level !== next.level) progressKeys.push("level");
        for (const id of new Set([...Object.keys(prev.completed), ...Object.keys(next.completed)])) {
          if (prev.completed[id] !== next.completed[id]) progressKeys.push(`completed:${id}`);
        }
        for (const id of new Set([...Object.keys(prev.answers), ...Object.keys(next.answers)])) {
          if (JSON.stringify(prev.answers[id]) !== JSON.stringify(next.answers[id])) progressKeys.push(`answers:${id}`);
        }
        recordLocalChange({ progressChanged: true, progressKeys });
      } catch {}
      return next;
    });
  }, []);

  return {
    ready, state,
    isDone: (id: string) => !!state.completed[id],
    countFor: (book: string) => Object.keys(state.completed).filter((k) => state.completed[k] && k.startsWith(book + "-")).length,
    totalDone: () => Object.values(state.completed).filter(Boolean).length,
    setDone: (id: string, v: boolean) => update((s) => ({ ...s, completed: { ...s.completed, [id]: v } })),
    setAnswer: (id: string, i: number, v: string) => update((s) => {
      const arr = [...(s.answers[id] ?? [])]; arr[i] = v; return { ...s, answers: { ...s.answers, [id]: arr } };
    }),
    setLevel: (level: ProgressState["level"]) => update((s) => ({ ...s, level })),
  };
}
