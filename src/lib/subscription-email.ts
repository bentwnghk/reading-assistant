import { getClient } from "./db"
import { sendEmail, isMailtrapConfigured } from "./email"
import {
  buildSubscriptionEmailHtml,
  buildSubscriptionEmailText,
  getSubscriptionEmailSubject,
} from "@/templates/subscription-email"
import type { SubscriptionEmailParams } from "@/templates/subscription-email"

export type SubscriptionEmailType =
  | "payment_failed"
  | "trial_ending"
  | "subscription_activated"
  | "subscription_canceled"
  | "subscription_renewed"

export async function sendSubscriptionEmail(
  params: SubscriptionEmailParams,
  type: SubscriptionEmailType
): Promise<boolean> {
  if (!isMailtrapConfigured()) {
    console.warn("[subscription-email] Mailtrap not configured, skipping")
    return false
  }

  if (!params.email) return false

  const html = buildSubscriptionEmailHtml(params, type)
  const text = buildSubscriptionEmailText(params, type)
  const subject = getSubscriptionEmailSubject(
    params.locale,
    type,
    params.plan
  )

  try {
    await sendEmail({
      to: [{ email: params.email, name: params.userName || undefined }],
      subject,
      html,
      text,
      category: `subscription-${type}`,
    })
    return true
  } catch (error) {
    console.error(`[subscription-email] Failed to send ${type}:`, error)
    return false
  }
}

export async function getUserEmailAndLocale(
  userId: string
): Promise<{ email: string | null; name: string | null; locale: string } | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT u.email, u.name, COALESCE(NULLIF(NULLIF(us.settings->>'language', 'system'), ''), 'zh-HK') AS locale
       FROM users u
       LEFT JOIN user_settings us ON us.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    )
    if (result.rows.length === 0) return null
    return {
      email: result.rows[0].email,
      name: result.rows[0].name,
      locale: result.rows[0].locale || "zh-HK",
    }
  } catch (error) {
    console.error("[subscription-email] Failed to get user info:", error)
    return null
  } finally {
    client.release()
  }
}

export async function notifySubscriptionEvent(
  userId: string,
  type: SubscriptionEmailType,
  opts: {
    plan?: string
    status?: string
    nextBillingDate?: string
    trialEndDate?: string
    paymentFailureReason?: string
  } = {}
): Promise<void> {
  const userInfo = await getUserEmailAndLocale(userId)
  if (!userInfo?.email) return

  const appUrl = process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000"

  let portalUrl: string | undefined
  if (type === "payment_failed" || type === "trial_ending") {
    try {
      const { createPortalSession } = await import("./subscription")
      portalUrl = await createPortalSession(
        userId,
        userInfo.email,
        userInfo.name
      )
    } catch {
      portalUrl = `${appUrl}/settings`
    }
  }

  await sendSubscriptionEmail(
    {
      userName: userInfo.name || "",
      email: userInfo.email,
      locale: userInfo.locale,
      plan: opts.plan || "monthly",
      status: opts.status || "active",
      appUrl,
      portalUrl,
      nextBillingDate: opts.nextBillingDate,
      trialEndDate: opts.trialEndDate,
      paymentFailureReason: opts.paymentFailureReason,
    },
    type
  )
}
