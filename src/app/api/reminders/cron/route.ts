import { ensureReminderTables, processReminders } from "@/lib/reminders"
import { isMailtrapConfigured } from "@/lib/email"
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
    await ensureReminderTables()
    const result = await processReminders(3)

    console.log(
      `[reminders/cron] Processed: ${result.processed}, Sent: ${result.sent}, Errors: ${result.errors}`
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("[reminders/cron] Error:", error)
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
