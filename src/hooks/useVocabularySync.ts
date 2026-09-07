"use client";
import { useEffect, useRef } from "react";
import { useReadingStore } from "@/store/reading";

export const MAX_SYNC_ATTEMPTS = 3;
export const SYNC_RETRY_BASE_DELAY_MS = 2_000;

const SYNC_URL = "/api/vocabulary/sync";

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

    // Mark the hash as synced only on success: a failed sync (network blip,
    // offline PWA) must retry instead of silently skipping these words
    // forever. A later glossary change supersedes this run entirely (the
    // cleanup cancels pending retries; the new effect run carries the
    // latest payload).
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const payload = JSON.stringify({
      glossary,
      ratings: glossaryRatings,
      sessionId: id,
    });

    const runSync = async () => {
      if (cancelled) return;
      attempt += 1;
      let ok = false;
      try {
        const res = await fetch(SYNC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        ok = res.ok;
        if (!ok) console.error(`Vocabulary sync failed: ${res.status}`);
      } catch (err) {
        console.error("Vocabulary sync failed:", err);
      }
      if (cancelled) return;
      if (ok) {
        prevHashRef.current = hash;
        return;
      }
      if (attempt < MAX_SYNC_ATTEMPTS) {
        timer = setTimeout(() => {
          void runSync();
        }, SYNC_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    };

    // Going back online is the most common recovery: reset the attempt
    // budget and retry immediately instead of waiting out the backoff.
    const retryNow = () => {
      if (cancelled) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      attempt = 0;
      void runSync();
    };

    window.addEventListener("online", retryNow);
    void runSync();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", retryNow);
    };
  }, [glossary, glossaryRatings, id]);
}
