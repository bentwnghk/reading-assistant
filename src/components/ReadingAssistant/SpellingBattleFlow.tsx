"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

import { useSpellingBattle } from "@/hooks/useSpellingBattle";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { logActivity } from "@/utils/activityLogger";
import { SpellingBattleLobby } from "./SpellingBattleLobby";
import { SpellingBattleArena } from "./SpellingBattleArena";
import { SpellingBattleResults } from "./SpellingBattleResults";

interface SpellingBattleFlowProps {
  /** Current reading-session id (reading-page context); enables the glossary source. */
  defaultGlossarySessionId?: string;
  /** Per-word SRS callback (fired on the /vocabulary page; undefined on the reading page). */
  onWordResult?: (word: string, correct: boolean) => void;
  /** Review-session callback (fired on the /vocabulary page; undefined on the reading page). */
  onComplete?: (results: { word: string; correct: boolean }[]) => void;
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
 *   - `onWordResult` / `onComplete` (SRS + review session — /vocabulary page only)
 *   - history `backup/update/save` (reading session persistence)
 * This keeps single-player and multiplayer stats unified.
 */
export function SpellingBattleFlow({
  defaultGlossarySessionId,
  onWordResult,
  onComplete,
  onExitToSolo,
}: SpellingBattleFlowProps) {
  const battle = useSpellingBattle();
  const { data: session } = useSession();
  const { id, setSpellingGameBestScore, backup } = useReadingStore();
  const { update, save } = useHistoryStore();

  const persistedRef = useRef(false);

  const handleExit = useCallback(() => {
    battle.leaveRoom();
    battle.disconnect();
    onExitToSolo();
  }, [battle, onExitToSolo]);

  // ── Persistence on game_end (runs once per battle) ───────────────────────
  useEffect(() => {
    if (battle.status !== "finished" || battle.finalRanking.length === 0) return;
    if (persistedRef.current) return;
    persistedRef.current = true;

    const myUserId = session?.user?.id;
    const me = battle.finalRanking.find((r) => r.userId === myUserId);
    if (!me) return;

    const totalWords = battle.totalWords || battle.finalRanking.length;
    const accuracy = totalWords > 0 ? Math.round((me.correctCount / totalWords) * 100) : 0;
    const difficulty = battle.config?.difficulty ?? "medium";

    // 1. Reading store: best score + running accuracy (both call sites).
    setSpellingGameBestScore(me.total, accuracy);

    // 2. Activity log → leaderboard (both call sites). The `multiplayer` flag
    //    + opponentCount/rank enrich the existing spelling_complete stream.
    logActivity("spelling_complete", {
      sessionId: id || undefined,
      score: me.total,
      accuracy,
      details: {
        mode: "listen-type",
        difficulty,
        multiplayer: true,
        opponentCount: Math.max(0, battle.finalRanking.length - 1),
        rank: me.rank,
        streak: me.maxStreak,
      },
    });

    // 3. /vocabulary page: SRS per-word + review-session POST.
    const wordResults = battle.myWordResults;
    if (wordResults.length > 0) {
      if (onWordResult) {
        for (const wr of wordResults) {
          onWordResult(wr.word, wr.correct);
        }
      }
      if (onComplete) {
        onComplete(wordResults);
      }
    }

    // 4. History persistence (reading session with updated spelling best score).
    if (id) {
      const sessionSnapshot = backup();
      const updated = update(id, sessionSnapshot);
      if (!updated) {
        save(sessionSnapshot);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.status, battle.finalRanking]);

  // Reset the persistence guard when a new battle begins.
  useEffect(() => {
    if (battle.status === "countdown") {
      persistedRef.current = false;
    }
  }, [battle.status]);

  // Finished → show results (final ranking is populated by game_end).
  if (battle.status === "finished" && battle.finalRanking.length > 0) {
    return <SpellingBattleResults onExit={handleExit} />;
  }

  // In-progress (countdown / playing) → arena.
  if (battle.status === "playing" || battle.status === "countdown" || battle.currentWord !== null) {
    return <SpellingBattleArena onExit={handleExit} />;
  }

  // Otherwise → lobby (create / join / waiting room).
  return <SpellingBattleLobby defaultGlossarySessionId={defaultGlossarySessionId} onExit={onExitToSolo} />;
}
