import { auth } from "@/auth"
import { logActivity, type ActivityType, type ActivityDetails, getWeekStart } from "@/lib/activity"
import { refreshWeeklyStatsForUser } from "@/lib/leaderboard"
import { checkAndUnlockAchievements } from "@/lib/achievements"
import { NextResponse } from "next/server"
import { z } from "zod"

const ActivitySchema = z.object({
  activityType: z.enum([
    "session_create",
    "test_complete",
    "quiz_complete",
    "spelling_complete",
    "flashcard_review",
    "mindmap_generate",
    "adapted_text_generate",
    "simplified_text_generate",
    "sentence_analyze",
    "targeted_practice_complete",
    "glossary_add",
    "ai_tutor_question",
  ]),
  sessionId: z.string().optional(),
  score:     z.number().min(0).max(10000).optional(),
  details:   z.object({
    cardsReviewed: z.number().int().min(0).optional(),
    wordCount:     z.number().int().min(0).optional(),
    mode:          z.string().optional(),
    difficulty:    z.string().optional(),
    streak:        z.number().int().min(0).optional(),
  }).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = ActivitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { activityType, sessionId, score, details } = parsed.data

    // Log the activity
    await logActivity(session.user.id, activityType as ActivityType, {
      sessionId,
      score,
      details: details as ActivityDetails | undefined,
    })

    // Trigger a non-blocking stats refresh for the current week
    // so leaderboard data stays fresh without needing a separate cron job.
    refreshWeeklyStatsForUser(session.user.id, getWeekStart()).catch((err) =>
      console.error("[activity] Failed to refresh weekly stats:", err)
    )

    // Check for newly unlocked achievements — non-blocking so any DB error
    // (e.g. migration not yet applied) never causes a 500 on this endpoint.
    let newlyUnlocked: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = []
    try {
      newlyUnlocked = await checkAndUnlockAchievements(session.user.id, activityType)
    } catch (err) {
      console.error("[activity] Achievement check failed (non-fatal):", err)
    }

    return NextResponse.json({ ok: true, newlyUnlocked }, { status: 201 })
  } catch (error) {
    console.error("[activity] POST error:", error)
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    )
  }
}
