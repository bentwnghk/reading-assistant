"use client";

import { useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

import { useSpellingBattle } from "@/hooks/useSpellingBattle";
import { useReadingStore } from "@/store/reading";
import { useBattleStore } from "@/store/battle";
import { useHistoryStore } from "@/store/history";
import { logActivity } from "@/utils/activityLogger";
import { computeBattleSessionAttribution } from "@/utils/battleAttribution";
import { SpellingBattleLobby } from "./SpellingBattleLobby";
import { SpellingBattleArena } from "./SpellingBattleArena";
import { SpellingBattleResults } from "./SpellingBattleResults";

interface SpellingBattleFlowProps {
  /** Current reading-session id (reading-page context); enables the glossary source. */
  defaultGlossarySessionId?: string;
  /** Inline word texts from the host's current selection (vocabulary-page context); enables the "selected" source. */
  selectedWords?: string[];
  /**
   * Optional per-word SRS callback (e.g. PATCH /api/vocabulary/word).
   * Page-supplied; may return a promise resolving to the word's SRS outcome
   * for the results screen's "spaced repetition updated" card.
   */
  onWordResult?: (word: string, correct: boolean) => void | Promise<VocabularySrsOutcome | null>;
  /** Return to the solo spelling setup. */
  onExitToSolo: () => void;
  /**
   * Tighten the ranking-list height caps for a shorter container (the Header
   * battle dialog, which renders inside a `max-h-[90vh]` DialogContent). When
   * true, the live + final ranking lists cap at smaller viewport-relative
   * heights so the question/answer area (mid-battle) and the result headline +
   * actions (end of battle) remain fully visible without scrolling the dialog.
   * The inline spelling-tab mount leaves this false (more generous caps).
   */
  compact?: boolean;
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
 *
 * SESSION-ATTRIBUTION GATE: battle words come from the HOST's word source
 * (their glossary, vocabulary bank, review list, hand-picked selection) and
 * may have nothing to do with the reading session currently open on this
 * client. Session-scoped writes (best score, spellingResults drill-down,
 * history persistence, sessionId on the activity log) only fire when the
 * battled words actually belong to the active session — decided by
 * utils/battleAttribution.ts: stemmed matching against the session's glossary
 * OR raw extracted text, full match required below 3 words, otherwise a
 * majority with a floor of 3 hits. Same-text class battles pass (each
 * player's AI glossary differs, and the words still occur in the shared
 * text); foreign-source battles (e.g. an invited battle on the host's
 * vocabulary bank) don't. Persisted battle entries carry the overlap fraction
 * so the teacher drill-down can badge them. User-scoped records (SRS PATCH,
 * `vocabulary_review_sessions`, activity log row itself) are ALWAYS written —
 * the leaderboard and dashboards count spelling from those, not from the
 * session columns.
 */
export function SpellingBattleFlow({
  defaultGlossarySessionId,
  selectedWords,
  onWordResult,
  onExitToSolo,
  compact,
}: SpellingBattleFlowProps) {
  const battle = useSpellingBattle();
  const { data: session } = useSession();
  const { id, setSpellingGameBestScore, setSpellingResults, backup } = useReadingStore();
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

    // Session-attribution gate (see file-level comment + utils/battleAttribution.ts):
    // do the battled words belong to the reading session currently open on
    // this client? Matching is stemmed glossary/raw-text occurrence, so the
    // host's own glossary is a 100% match, a same-text class battle matches
    // despite AI-glossary drift and inflection differences, and foreign
    // sources (the host's vocabulary bank, another session, a review list)
    // score little to none. Threshold: full match below 3 words, otherwise
    // max(majority, 3 hits). `overlap` is persisted on the drill-down record
    // so teachers can see how much of an attributed battle was actually this
    // text's words.
    const store = useReadingStore.getState();
    const { belongsToSession, overlap } = computeBattleSessionAttribution({
      sessionId: id,
      battleWords: battle.myWordResults.map((wr) => wr.word),
      glossaryWords: store.glossary.map((g) => g.word),
      extractedText: store.extractedText,
    });

    // 1. Reading store: best score + running accuracy (both call sites).
    //    Read the PREVIOUS best BEFORE the max-update so the results screen
    //    can celebrate a new personal best (the store only keeps a max).
    //    Session-scoped — skipped for battles whose words aren't from this
    //    session (the "new best" celebration is skipped too: celebrating a
    //    best that is never recorded would be misleading).
    if (belongsToSession) {
      const previousBest = store.spellingGameBestScore;
      const isNewBest = previousBest > 0 && me.total > previousBest;
      useBattleStore.getState().setNewBestAchieved(isNewBest);
      setSpellingGameBestScore(me.total, accuracy);
    }

    // 1b. Per-word drill-down record (teacher Student Data view). Battles only
    //     track correctness client-side (myWordResults has no answer text), so
    //     userAnswer is empty — the dialog shows the word + green/red state.
    //     Entries are tagged `source: "battle"` + the session-overlap fraction
    //     so the drill-down can badge the record honestly (transparency for
    //     imperfect attribution — see #3 in the gate's design notes).
    //     Same gate: a drill-down of foreign words on a session's spelling
    //     record is exactly the confusion this gate prevents.
    if (belongsToSession && battle.myWordResults.length > 0) {
      setSpellingResults(
        battle.myWordResults.map((wr) => ({
          word: wr.word,
          userAnswer: "",
          correct: wr.correct,
          mode: gameMode,
          source: "battle" as const,
          overlap,
        })),
      );
    }

    // 2. Activity log → leaderboard (both call sites). The `multiplayer` flag
    //    + opponentCount/rank enrich the existing spelling_complete stream.
    //    The row itself is user-scoped (always logged); the sessionId
    //    attribution follows the gate.
    const attributedSessionId = belongsToSession ? id : undefined;
    logActivity("spelling_complete", {
      sessionId: attributedSessionId,
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

    // 2b. Achievement-granular events: each drives its own achievement track
    //     (Battle Champion / On Fire). Separate activity types keep the
    //     spelling_challenges counter (spelling_complete) undisturbed.
    if (me.rank === 1 && battle.finalRanking.length > 1) {
      logActivity("spelling_battle_win", {
        sessionId: attributedSessionId,
        score: me.total,
        accuracy,
        details: {
          mode: gameMode,
          difficulty,
          opponentCount: battle.finalRanking.length - 1,
          rank: 1,
        },
      });
    }
    if ((me.maxStreak ?? 0) >= 5) {
      logActivity("spelling_hot_streak", {
        sessionId: attributedSessionId,
        score: me.total,
        accuracy,
        details: { mode: gameMode, difficulty, streak: me.maxStreak },
      });
    }

    // 3. SRS per-word (optional, page-supplied) + UNCONDITIONAL review-session
    //    POST. The vocabulary_review_sessions row is the authoritative
    //    per-game record the dashboards count from, so it must be created for
    //    every battle regardless of entry point. Matches the solo game's
    //    review-session payload (mode "spelling"); the server enriches each
    //    word's masteryAfter from user_vocabulary, so the POST must wait for
    //    the per-word PATCHes to commit first.
    const wordResults = battle.myWordResults;
    if (wordResults.length > 0) {
      // Collect SRS outcomes from callers that return them (the results-screen
      // card is omitted for fire-and-forget callers). Failures are swallowed.
      const outcomes: VocabularySrsOutcome[] = [];
      const settled: Promise<void>[] = [];
      if (onWordResult) {
        for (const wr of wordResults) {
          const maybe = onWordResult(wr.word, wr.correct);
          if (maybe && typeof maybe.then === "function") {
            settled.push(
              maybe
                .then((o) => {
                  if (o) outcomes.push(o);
                })
                .catch(() => {}),
            );
          }
        }
      }
      const postReviewSession = () => {
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
      };
      if (settled.length > 0) {
        void Promise.all(settled).then(() => {
          useBattleStore.getState().setSrsOutcomes(outcomes);
          postReviewSession();
        });
      } else {
        postReviewSession();
      }
    }

    // 4. History persistence (reading session with updated spelling best
    //    score). Same gate — only persist into the session the battle was
    //    attributed to. Unattributed battles still live in
    //    vocabulary_review_sessions + activity_logs (steps 2/3).
    if (id && belongsToSession) {
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
    return <SpellingBattleResults onExit={handleExit} compact={compact} />;
  }

  // In-progress (countdown / playing) → arena.
  if (battle.status === "playing" || battle.status === "countdown" || battle.currentWord !== null) {
    return <SpellingBattleArena onExit={handleExit} compact={compact} />;
  }

  // Otherwise → lobby (create / join / waiting room).
  return <SpellingBattleLobby defaultGlossarySessionId={defaultGlossarySessionId} selectedWords={selectedWords} onExit={onExitToSolo} />;
}
