import { auth } from "@/auth"
import { ensureSubscriptionTable } from "@/lib/subscription"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureSubscriptionTable()

  const { searchParams } = new URL(request.url)
  const view = searchParams.get("view") || "current"

  const client = await getClient()
  try {
    let periodStart: string | null = null
    let periodEnd: string | null = null

    if (view === "current") {
      const result = await client.query(
        `SELECT current_period_start, current_period_end FROM subscriptions
         WHERE user_id = $1 AND status IN ('active', 'trialing')
         ORDER BY updated_at DESC LIMIT 1`,
        [session.user.id]
      )
      if (result.rows.length > 0) {
        periodStart = result.rows[0].current_period_start
        periodEnd = result.rows[0].current_period_end
      }
    }

    if (!periodStart || !periodEnd) {
      const defaultStart = new Date()
      defaultStart.setDate(defaultStart.getDate() - 30)
      periodStart = defaultStart.toISOString()
      periodEnd = new Date().toISOString()
    }

    const breakdownResult = await client.query(
      `SELECT activity_type, COUNT(*) as count
       FROM activity_logs
       WHERE user_id = $1
         AND created_at >= $2
         AND created_at <= $3
       GROUP BY activity_type
       ORDER BY count DESC`,
      [session.user.id, periodStart, periodEnd]
    )

    const totalResult = await client.query(
      `SELECT COUNT(*) as total FROM activity_logs
       WHERE user_id = $1
         AND created_at >= $2
         AND created_at <= $3`,
      [session.user.id, periodStart, periodEnd]
    )

    const dailyResult = await client.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM activity_logs
       WHERE user_id = $1
         AND created_at >= $2
         AND created_at <= $3
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [session.user.id, periodStart, periodEnd]
    )

    const sessionsResult = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE test_completed = true) as tests_completed,
              AVG(test_score) as avg_test_score
       FROM reading_sessions
       WHERE user_id = $1
         AND created_at >= $2
         AND created_at <= $3`,
      [session.user.id, periodStart, periodEnd]
    )

    const subscriptionResult = await client.query(
      `SELECT status, plan, current_period_start, current_period_end, trial_end
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY updated_at DESC LIMIT 1`,
      [session.user.id]
    )

    return NextResponse.json({
      period: {
        start: periodStart,
        end: periodEnd,
      },
      activities: {
        total: Number(totalResult.rows[0].total),
        breakdown: breakdownResult.rows.map((r) => ({
          activity_type: r.activity_type,
          count: Number(r.count),
        })),
        daily: dailyResult.rows.map((r) => ({
          date: r.date,
          count: Number(r.count),
        })),
      },
      sessions: {
        total: Number(sessionsResult.rows[0].total),
        testsCompleted: Number(sessionsResult.rows[0].tests_completed),
        avgTestScore: sessionsResult.rows[0].avg_test_score
          ? Number(Number(sessionsResult.rows[0].avg_test_score).toFixed(1))
          : null,
      },
      subscription: subscriptionResult.rows[0] || null,
    })
  } catch (error) {
    console.error("[subscription/usage] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
