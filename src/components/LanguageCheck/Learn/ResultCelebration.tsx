"use client";
/**
 * Celebratory confetti + fanfare for the Learn result moments — the end of a
 * practice, the end of a quiz and the session summary — using the same shared
 * game "juice" as the multiplayer spelling battle result screen (`burstConfetti`
 * from GameFx plus the Web Audio fanfare), tiered by mastery so the
 * celebration matches the achievement:
 *
 *   secure (≥80)  → fanfare + gold burst + delayed festive burst
 *   developing    → single smaller burst
 *   review        → none (the result card is encouragement enough)
 *
 * Firing rules:
 *   - `useFinishCelebration` celebrates the moment the results APPEAR (a
 *     false → true transition). Opening a stage that was already finished
 *     (revisiting a completed unit from the path) stays quiet.
 *   - `SummaryCelebration` fires once per session per page life (module-level
 *     Set, §A): flipping between the summary and a topic review stays quiet,
 *     while a fresh page load celebrates again when the results are shown.
 *
 * Reduced motion disables all confetti (guarded inside burstConfetti) and the
 * fanfare is further gated by the game-sound-effects setting and the
 * audio-unlock state (playSfx skips silently when it cannot play).
 */
import { useEffect, useRef } from "react";
import { burstConfetti } from "@/components/ReadingAssistant/GameFx";
import { playSfx } from "@/utils/sfx";
import type { Mastery } from "@/utils/languageCheckLearnGrade";

const FESTIVE = ["#a855f7", "#6366f1", "#22d3ee", "#10b981"];

/** Tiered celebration for a shown result. Renders nothing; safe anywhere. */
export function celebrateMastery(mastery: Mastery): void {
  if (mastery === "secure") {
    playSfx("newBest");
    burstConfetti({ count: 100, spread: 75 });
    // A second, colourful wave right after the gold one — the same double
    // burst the top tier of the game result screens plays.
    setTimeout(() => burstConfetti({ count: 70, spread: 100, colors: FESTIVE }), 280);
  } else if (mastery === "developing") {
    burstConfetti({ count: 50, spread: 70 });
  }
}

/**
 * Celebrates when `finished` flips to true — the moment the results appear
 * after working through the stage. Mounting with `finished` already true
 * (a revisit of a completed stage) does not celebrate.
 */
export function useFinishCelebration(finished: boolean, mastery: Mastery | null): void {
  const prevRef = useRef(finished);
  useEffect(() => {
    const wasFinished = prevRef.current;
    prevRef.current = finished;
    if (finished && !wasFinished && mastery) celebrateMastery(mastery);
  }, [finished, mastery]);
}

/** Session keys whose summary has already celebrated in this page life. */
const celebratedSummaries = new Set<string>();

/** Mount-triggered celebration for the session summary. Renders nothing. */
export function SummaryCelebration({
  sessionKey,
  mastery,
}: {
  sessionKey: string;
  mastery: Mastery;
}) {
  useEffect(() => {
    if (celebratedSummaries.has(sessionKey)) return;
    celebratedSummaries.add(sessionKey);
    celebrateMastery(mastery);
  }, [sessionKey, mastery]);
  return null;
}
