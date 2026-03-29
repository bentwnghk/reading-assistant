import { ensureReminderTables, processReminders } from "@/lib/reminders"
import { isMailtrapConfigured } from "@/lib/email"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"

function verifyCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get("authorization")
  if (!authHeader) return false

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return false

  return match[1] === cronSecret
}

async function getDebugInfo() {
  const client = await getClient()
  try {
    const totalUsers = await client.query(
      `SELECT COUNT(*) AS count FROM users`
    )
    const verifiedUsers = await client.query(
      `SELECT COUNT(*) AS count FROM users WHERE "emailVerified" IS NOT NULL AND email IS NOT NULL`
    )
    const usersWithActivity = await client.query(
      `SELECT COUNT(DISTINCT user_id) AS count FROM activity_logs`
    )
    const recentActivity = await client.query(
      `SELECT COUNT(DISTINCT user_id) AS count FROM activity_logs WHERE created_at > NOW() - INTERVAL '3 days'`
    )
    const tablesExist = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('email_reminder_logs', 'email_reminder_preferences')
    `)
    return {
      totalUsers: Number(totalUsers.rows[0].count),
      emailVerifiedUsers: Number(verifiedUsers.rows[0].count),
      usersWithAnyActivity: Number(usersWithActivity.rows[0].count),
      usersActiveInLast3Days: Number(recentActivity.rows[0].count),
      reminderTablesExist: tablesExist.rows.map((r: { table_name: string }) => r.table_name),
    }
  } finally {
    client.release()
  }
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isMailtrapConfigured()) {
    return NextResponse.json(
      { error: "Mailtrap is not configured. Set MAILTRAP_API_KEY." },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const rawDays = searchParams.get("days")
    const days = rawDays !== null ? Math.max(0, Number(rawDays)) : 3
    const debug = searchParams.get("debug") === "1"

    await ensureReminderTables()

    if (debug) {
      const info = await getDebugInfo()
      return NextResponse.json({ debug: info })
    }

    const result = await processReminders(days)

    console.log(
      `[reminders/cron] Processed: ${result.processed}, Sent: ${result.sent}, Errors: ${result.errors}`
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("[reminders/cron] Error:", error)
    return NextResponse.json(
      { error: "Failed to process reminders", detail: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
