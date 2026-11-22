import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseError } from "@/utils/error";
import {
  getDailyWordDays,
  isDayInRange,
  markDailyWordLearned,
  pinDailyWord,
  setDailyWordNote,
  userHasWord,
} from "@/lib/daily-word";
import { dailyWordActionSchema } from "@/lib/daily-word-schema";
import { logActivity, getWeekStart } from "@/lib/activity";
import {
  createReviewSession,
  getVocabularyWordMastery,
  insertVocabularyWordOnReview,
  updateVocabularyReview,
} from "@/lib/vocabulary";
import { calculateNextReview } from "@/utils/srs";
import { refreshWeeklyStatsForUser, refreshAllTimeStatsForUser } from "@/lib/leaderboard";
import { checkAndUnlockAchievements, type NewlyUnlockedAchievement } from "@/lib/achievements";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const days = await getDailyWordDays(session.user.id);
    return NextResponse.json({ days });
  } catch (error) {
    console.error("Daily word GET error:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = dailyWordActionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    if (!isDayInRange(body.dayKey)) {
      return NextResponse.json({ error: "Day out of range" }, { status: 400 });
    }
    // Only words the user actually owns can be a word of the day.
    if (!(await userHasWord(userId, body.word))) {
      return NextResponse.json({ error: "Unknown word" }, { status: 404 });
    }

    if (body.action === "pin") {
      const day = await pinDailyWord(userId, body.dayKey, body.word);
      return NextResponse.json({ day });
    }
    if (body.action === "learn") {
      const { day, newlyLearned } = await markDailyWordLearned(
        userId,
        body.dayKey,
        body.word,
        body.onTime
      );

      // A day transitions to learned exactly once — log the activity then
      // (same contract as POST /api/activity: stats refresh + achievements).
      let newlyUnlocked: NewlyUnlockedAchievement[] = [];
      let srs: { newMastery: number; nextReviewAt: number } | null = null;
      if (newlyLearned) {
        // Completing the day counts as one CORRECT review: the word moves up
        // one Leitner box (same math as PATCH /api/vocabulary/word with
        // { correct: true }, computed from the authoritative DB level).
        const existing = await getVocabularyWordMastery(userId, day.word);
        const currentLevel = (existing?.masteryLevel ?? 0) as 0 | 1 | 2 | 3 | 4 | 5;
        const { newMastery, nextReviewAt } = calculateNextReview(currentLevel, true);
        const updated = await updateVocabularyReview(
          userId,
          day.word,
          true,
          newMastery,
          nextReviewAt
        );
        if (!updated) {
          // Word not in user_vocabulary (sync gap) — create it carrying the
          // review outcome, then the UPDATE if the insert raced.
          const inserted = await insertVocabularyWordOnReview(
            userId,
            day.word,
            true,
            newMastery,
            nextReviewAt
          );
          if (!inserted) {
            await updateVocabularyReview(userId, day.word, true, newMastery, nextReviewAt);
          }
        }
        srs = { newMastery, nextReviewAt };

        // History tab entry: one review-session row (also feeds staff
        // vocabulary analytics via the session_completed event).
        createReviewSession(
          userId,
          "daily-word",
          [
            {
              word: day.word,
              correct: true,
              masteryBefore: currentLevel,
              masteryAfter: newMastery,
              attempts: 1,
            },
          ],
          undefined,
          "word"
        ).catch((err) =>
          console.error("[daily-word] Failed to record review session:", err)
        );

        await logActivity(userId, "daily_word_complete", {
          details: { word: day.word },
        });
        Promise.all([
          refreshWeeklyStatsForUser(userId, getWeekStart()),
          refreshAllTimeStatsForUser(userId),
        ]).catch((err) =>
          console.error("[daily-word] Failed to refresh stats:", err)
        );
        try {
          newlyUnlocked = await checkAndUnlockAchievements(
            userId,
            "daily_word_complete"
          );
        } catch (err) {
          console.error("[daily-word] Achievement check failed (non-fatal):", err);
        }
      }
      return NextResponse.json({ day, newlyUnlocked, srs });
    }
    await setDailyWordNote(userId, body.dayKey, body.word, body.note);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Daily word POST error:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
