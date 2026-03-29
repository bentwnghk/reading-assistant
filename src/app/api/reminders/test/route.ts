import { auth } from "@/auth"
import { ensureReminderTables } from "@/lib/reminders"
import { sendEmail, isMailtrapConfigured } from "@/lib/email"
import {
  buildReminderEmailHtml,
  buildReminderEmailText,
  getEmailStrings,
  getActivityDisplayName,
} from "@/templates/reminder-email"
import { getUserSettings } from "@/lib/settings"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!session.user.email) {
      return NextResponse.json({ error: "No email on account" }, { status: 400 })
    }

    if (!isMailtrapConfigured()) {
      return NextResponse.json(
        { error: "Mailtrap is not configured. Set MAILTRAP_API_KEY." },
        { status: 503 }
      )
    }

    await ensureReminderTables()

    const client = await getClient()
    let lastActivityType = "session_create"
    let lastActivityAt: Date | null = null
    try {
      const result = await client.query(
        `SELECT activity_type, created_at FROM activity_logs
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [session.user.id]
      )
      if (result.rows.length > 0) {
        lastActivityType = result.rows[0].activity_type
        lastActivityAt = new Date(result.rows[0].created_at)
      }
    } finally {
      client.release()
    }

    const settings = await getUserSettings(session.user.id)
    const locale = settings?.language || "system"
    const resolvedLocale =
      locale === "system" || !locale ? "en-US" : locale

    const appUrl = process.env.APP_URL || "http://localhost:3000"
    const s = getEmailStrings(resolvedLocale)
    const activityName = getActivityDisplayName(lastActivityType, resolvedLocale)
    const daysInactive = 3
    const dayText = s.day(daysInactive)

    const lastActivityDate = lastActivityAt
      ? lastActivityAt.toLocaleDateString(resolvedLocale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString(resolvedLocale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })

    const html = buildReminderEmailHtml({
      userName: session.user.name || "",
      daysInactive,
      lastActivityDate,
      lastActivityType,
      appUrl,
      unsubscribeUrl: `${appUrl}/settings`,
      locale: resolvedLocale,
    })

    const text = buildReminderEmailText({
      userName: session.user.name || "",
      daysInactive,
      lastActivityDate,
      lastActivityType,
      appUrl,
      unsubscribeUrl: `${appUrl}/settings`,
      locale: resolvedLocale,
    })

    await sendEmail({
      to: [{ email: session.user.email, name: session.user.name || undefined }],
      subject: `[TEST] ${s.subject(dayText, activityName)}`,
      html,
      text,
      category: "test-reminder",
    })

    return NextResponse.json({ success: true, sentTo: session.user.email })
  } catch (error) {
    console.error("[reminders/test] Error:", error)
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    )
  }
}
