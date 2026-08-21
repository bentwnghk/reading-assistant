import { auth } from "@/auth"
import { ACTIVITY_TYPES, logActivity, type ActivityType, type ActivityDetails, getWeekStart } from "@/lib/activity"
import { refreshWeeklyStatsForUser, refreshAllTimeStatsForUser } from "@/lib/leaderboard"
import { checkAndUnlockAchievements } from "@/lib/achievements"
import { NextResponse } from "next/server"
import { z } from "zod"

const ActivitySchema = z.object({
  // Derived from the canonical list in lib/activity — adding an activity type
  // there is the ONLY change needed for it to be accepted here.
  activityType: z.enum(ACTIVITY_TYPES),
  sessionId: z.string().optional(),
  score:     z.number().min(0).max(10000).optional(),
  accuracy:  z.number().min(0).max(100).optional(),
  details: z.object({
    cardsReviewed: z.number().int().min(0).optional(),
    wordCount:     z.number().int().min(0).optional(),
    mode:          z.string().optional(),
    difficulty:    z.string().optional(),
    streak:        z.number().int().min(0).optional(),
    multiplayer:   z.boolean().optional(),
    opponentCount: z.number().int().min(0).optional(),
    rank:          z.number().int().min(0).optional(),
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

    const { activityType, sessionId, score, accuracy, details } = parsed.data

    // Log the activity
    await logActivity(session.user.id, activityType as ActivityType, {
      sessionId,
      score,
      accuracy,
      details: details as ActivityDetails | undefined,
    })

    // Trigger a non-blocking stats refresh for the current week AND all-time
    // so leaderboard data stays fresh without needing a separate cron job.
    Promise.all([
      refreshWeeklyStatsForUser(session.user.id, getWeekStart()),
      refreshAllTimeStatsForUser(session.user.id),
    ]).catch((err) =>
      console.error("[activity] Failed to refresh stats:", err)
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
