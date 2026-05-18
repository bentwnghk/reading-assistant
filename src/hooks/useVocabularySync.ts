"use client";
import { useEffect, useRef } from "react";
import { useReadingStore } from "@/store/reading";

function hashGlossary(glossary: GlossaryEntry[]): string {
  if (glossary.length === 0) return "";
  return glossary
    .map((e) => e.word)
    .sort()
    .join(",");
}

export function useVocabularySync() {
  const { glossary, glossaryRatings, id } = useReadingStore();
  const prevHashRef = useRef("");

  useEffect(() => {
    const hash = hashGlossary(glossary);
    if (!hash || !id || hash === prevHashRef.current) return;
    prevHashRef.current = hash;

    fetch("/api/vocabulary/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        glossary,
        ratings: glossaryRatings,
        sessionId: id,
      }),
    }).catch((err) => {
      console.error("Vocabulary sync failed:", err);
    });
  }, [glossary, glossaryRatings, id]);
}
