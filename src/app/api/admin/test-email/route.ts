import { auth } from "@/auth"
import { sendEmail, isMailtrapConfigured } from "@/lib/email"
import {
  buildReminderEmailHtml,
  buildReminderEmailText,
  getEmailStrings,
  getActivityDisplayName,
} from "@/templates/reminder-email"
import {
  buildSubscriptionEmailHtml,
  buildSubscriptionEmailText,
  getSubscriptionEmailSubject,
} from "@/templates/subscription-email"
import type { SubscriptionEmailType } from "@/templates/subscription-email"
import { getUserSettings } from "@/lib/settings"
import { formatDateLong } from "@/utils/formatDate"
import { getClient } from "@/lib/db"
import { generateUnsubscribeToken, ensureReminderTables } from "@/lib/reminders"
import { NextResponse } from "next/server"
import { z } from "zod"

const TEST_EMAIL_TYPES = [
  "reminder",
  "payment_failed",
  "trial_ending",
  "subscription_activated",
  "subscription_canceled",
  "subscription_renewed",
  "renewal_reminder",
  "payment_receipt",
  "school_access_revoked",
] as const

const schema = z.object({
  type: z.enum(TEST_EMAIL_TYPES),
})

export async function POST(request: Request) {
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

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid email type. Valid types: ${TEST_EMAIL_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    const { type } = parsed.data

    const settings = await getUserSettings(session.user.id)
    const rawLocale = settings?.language || "zh-HK"
    const resolvedLocale = rawLocale === "system" || !rawLocale ? "zh-HK" : rawLocale

    const appUrl = process.env.APP_URL || "http://localhost:3000"

    if (type === "reminder") {
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

      const s = getEmailStrings(resolvedLocale)
      const activityName = getActivityDisplayName(lastActivityType, resolvedLocale)
      const daysInactive = 3
      const dayText = s.day(daysInactive)
      const lastActivityDate = lastActivityAt
        ? formatDateLong(lastActivityAt, resolvedLocale)
        : formatDateLong(new Date(), resolvedLocale)

      const unsubscribeToken = generateUnsubscribeToken(session.user.id)
      const unsubscribeUrl = `${appUrl}/api/reminders/preferences?unsubscribe=1&uid=${session.user.id}&token=${unsubscribeToken}`

      const html = buildReminderEmailHtml({
        userName: session.user.name || "",
        daysInactive,
        lastActivityDate,
        lastActivityType,
        appUrl,
        unsubscribeUrl,
        locale: resolvedLocale,
      })

      const text = buildReminderEmailText({
        userName: session.user.name || "",
        daysInactive,
        lastActivityDate,
        lastActivityType,
        appUrl,
        unsubscribeUrl,
        locale: resolvedLocale,
      })

      await sendEmail({
        to: [{ email: session.user.email, name: session.user.name || undefined }],
        subject: `[TEST] ${s.subject(dayText, activityName)}`,
        html,
        text,
        category: "test-reminder",
      })
    } else {
      const subType = type as SubscriptionEmailType
      const userName = session.user.name || "Test User"
      const plan = "monthly"
      const portalUrl = `${appUrl}/settings`

      const params = {
        userName,
        email: session.user.email,
        locale: resolvedLocale,
        plan,
        status: "active",
        appUrl,
        portalUrl,
        nextBillingDate: formatDateLong(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          resolvedLocale
        ),
        trialEndDate: formatDateLong(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          resolvedLocale
        ),
        paymentFailureReason: "Card declined",
        cancelAtPeriodEnd: true,
        invoiceUrl: "https://example.com/invoice/test.pdf",
        invoiceAmount: "$9.99",
        invoiceDate: formatDateLong(new Date(), resolvedLocale),
        invoiceNumber: "INV-TEST-001",
        schoolName: "Test School",
        totalSeats: 50,
        accessEndDate: formatDateLong(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          resolvedLocale
        ),
      }

      const html = buildSubscriptionEmailHtml(params, subType)
      const text = buildSubscriptionEmailText(params, subType)
      const subject = getSubscriptionEmailSubject(resolvedLocale, subType, plan)

      await sendEmail({
        to: [{ email: session.user.email, name: session.user.name || undefined }],
        subject: `[TEST] ${subject}`,
        html,
        text,
        category: `test-subscription-${subType}`,
      })
    }

    return NextResponse.json({ success: true, sentTo: session.user.email, type })
  } catch (error) {
    console.error("[admin/test-email] Error:", error)
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    )
  }
}
