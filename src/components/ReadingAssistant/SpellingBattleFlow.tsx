"use client";

import { useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

import { useSpellingBattle } from "@/hooks/useSpellingBattle";
import { useReadingStore } from "@/store/reading";
import { useBattleStore } from "@/store/battle";
import { useHistoryStore } from "@/store/history";
import { logActivity } from "@/utils/activityLogger";
import { SpellingBattleLobby } from "./SpellingBattleLobby";
import { SpellingBattleArena } from "./SpellingBattleArena";
import { SpellingBattleResults } from "./SpellingBattleResults";

interface SpellingBattleFlowProps {
  /** Current reading-session id (reading-page context); enables the glossary source. */
  defaultGlossarySessionId?: string;
  /** Inline word texts from the host's current selection (vocabulary-page context); enables the "selected" source. */
  selectedWords?: string[];
  /** Optional per-word SRS callback (e.g. PATCH /api/vocabulary/word). Page-supplied. */
  onWordResult?: (word: string, correct: boolean) => void;
  /** Return to the solo spelling setup. */
  onExitToSolo: () => void;
}

/**
 * Top-level multiplayer flow controller. Renders the lobby, arena, or results
 * based on the live room status from the `useSpellingBattle` hook. The
 * underlying Socket.io connection + Zustand store survive SPA navigation.
 *
 * On game_end, persists the result via the SAME paths the solo game uses:
 *   - `setSpellingGameBestScore` (reading store — best score + running accuracy)
 *   - `logActivity("spelling_complete", { multiplayer: true, ... })` (leaderboard)
 *   - `onWordResult` (optional, page-supplied SRS per-word PATCH) + an
 *     UNCONDITIONAL `vocabulary_review_sessions` POST
 *   - history `backup/update/save` (reading session persistence)
 *
 * The review-session POST is intrinsic (not a page callback) because that row
 * is the authoritative per-game record the student/teacher dashboards count
 * spelling games, accuracy, and attempts from. Making it unconditional ensures
 * battles started from ANY entry point (Header dialog, reading page,
 * vocabulary page) are tracked — previously a page-supplied `onComplete`
 * silently dropped battles from entry points that didn't wire it.
 */
export function SpellingBattleFlow({
  defaultGlossarySessionId,
  selectedWords,
  onWordResult,
  onExitToSolo,
}: SpellingBattleFlowProps) {
  const battle = useSpellingBattle();
  const { data: session } = useSession();
  const { id, setSpellingGameBestScore, backup } = useReadingStore();
  const { update, save } = useHistoryStore();

  const handleExit = useCallback(() => {
    battle.leaveRoom();
    battle.disconnect();
    onExitToSolo();
  }, [battle, onExitToSolo]);

  // ── Persistence on game_end (runs once per battle) ───────────────────────
  useEffect(() => {
    if (battle.status !== "finished" || battle.finalRanking.length === 0) return;
    if (battle.resultPersisted) return;

    const myUserId = session?.user?.id;
    const me = battle.finalRanking.find((r) => r.userId === myUserId);
    if (!me) return;

    const totalWords = battle.totalWords || battle.finalRanking.length;
    const accuracy = totalWords > 0 ? Math.round((me.correctCount / totalWords) * 100) : 0;
    const difficulty = battle.config?.difficulty ?? "medium";
    const gameMode = battle.config?.gameMode ?? "listen-type";

    // 1. Reading store: best score + running accuracy (both call sites).
    setSpellingGameBestScore(me.total, accuracy);

    // 2. Activity log → leaderboard (both call sites). The `multiplayer` flag
    //    + opponentCount/rank enrich the existing spelling_complete stream.
    logActivity("spelling_complete", {
      sessionId: id || undefined,
      score: me.total,
      accuracy,
      details: {
        mode: gameMode,
        difficulty,
        multiplayer: true,
        opponentCount: Math.max(0, battle.finalRanking.length - 1),
        rank: me.rank,
        streak: me.maxStreak,
      },
    });

    // 3. SRS per-word (optional, page-supplied) + UNCONDITIONAL review-session
    //    POST. The vocabulary_review_sessions row is the authoritative
    //    per-game record the dashboards count from, so it must be created for
    //    every battle regardless of entry point. Matches the solo game's
    //    review-session payload (mode "spelling", masteryBefore/After = 0).
    const wordResults = battle.myWordResults;
    if (wordResults.length > 0) {
      if (onWordResult) {
        for (const wr of wordResults) {
          onWordResult(wr.word, wr.correct);
        }
      }
      const reviewResults = wordResults.map((wr) => ({
        word: wr.word,
        correct: wr.correct,
        masteryBefore: 0,
        masteryAfter: 0,
      }));
      fetch("/api/vocabulary/review-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "spelling", results: reviewResults }),
      }).catch(() => {
        // Silent — battle result tracking must never break the UX.
      });
    }

    // 4. History persistence (reading session with updated spelling best score).
    if (id) {
      const sessionSnapshot = backup();
      const updated = update(id, sessionSnapshot);
      if (!updated) {
        save(sessionSnapshot);
      }
    }

    // Mark as persisted AFTER the side effects have fired so the guard
    // survives component remounts (e.g. navigate away and back).
    useBattleStore.getState().setResultPersisted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.status, battle.finalRanking, battle.resultPersisted]);

  // ── Rendering ────────────────────────────────────────────────────────────
  if (battle.status === "finished" && battle.finalRanking.length > 0) {
    return <SpellingBattleResults onExit={handleExit} />;
  }

  // In-progress (countdown / playing) → arena.
  if (battle.status === "playing" || battle.status === "countdown" || battle.currentWord !== null) {
    return <SpellingBattleArena onExit={handleExit} />;
  }

  // Otherwise → lobby (create / join / waiting room).
  return <SpellingBattleLobby defaultGlossarySessionId={defaultGlossarySessionId} selectedWords={selectedWords} onExit={onExitToSolo} />;
}
