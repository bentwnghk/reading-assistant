import { getClient } from "./db"
import { sendEmail, isMailtrapConfigured } from "./email"
import {
  buildSubscriptionEmailHtml,
  buildSubscriptionEmailText,
  getSubscriptionEmailSubject,
} from "@/templates/subscription-email"
import type { SubscriptionEmailParams } from "@/templates/subscription-email"
import type { SubscriptionEmailType } from "@/templates/subscription-email"

export type { SubscriptionEmailType }

export interface SchoolContext {
  schoolName: string
  totalSeats: number
}

export async function sendSubscriptionEmail(
  params: SubscriptionEmailParams,
  type: SubscriptionEmailType,
  attachments?: { filename: string; content: string; type?: string }[]
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
      ...(attachments?.length ? { attachments } : {}),
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

export async function getSchoolContext(
  schoolId: string
): Promise<SchoolContext | null> {
  const client = await getClient()
  try {
    const result = await client.query(
      `SELECT s.name AS school_name, ss.quantity
       FROM schools s
       JOIN school_subscriptions ss ON ss.school_id = s.id
       WHERE s.id = $1
       ORDER BY ss.created_at DESC
       LIMIT 1`,
      [schoolId]
    )
    if (result.rows.length === 0) return null
    return {
      schoolName: result.rows[0].school_name,
      totalSeats: result.rows[0].quantity || 0,
    }
  } catch (error) {
    console.error("[subscription-email] Failed to get school context:", error)
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
    cancelAtPeriodEnd?: boolean
    schoolContext?: SchoolContext
  } = {}
): Promise<void> {
  const userInfo = await getUserEmailAndLocale(userId)
  if (!userInfo?.email) return

  const appUrl = process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000"

  let portalUrl: string | undefined
  if (type === "payment_failed" || type === "trial_ending" || type === "renewal_reminder") {
    try {
      if (opts.schoolContext) {
        const { createSchoolPortalSession } = await import("./school-subscription")
        const client = await getClient()
        let schoolId: string | null = null
        try {
          const result = await client.query(
            "SELECT school_id FROM school_subscriptions WHERE admin_user_id = $1 LIMIT 1",
            [userId]
          )
          if (result.rows.length > 0) schoolId = result.rows[0].school_id
        } finally {
          client.release()
        }
        if (schoolId) {
          portalUrl = await createSchoolPortalSession(
            userId,
            schoolId,
            userInfo.email,
            userInfo.name
          )
        } else {
          portalUrl = `${appUrl}`
        }
      } else {
        const { createPortalSession } = await import("./subscription")
        portalUrl = await createPortalSession(
          userId,
          userInfo.email,
          userInfo.name
        )
      }
    } catch {
      portalUrl = `${appUrl}`
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
      cancelAtPeriodEnd: opts.cancelAtPeriodEnd,
      ...(opts.schoolContext
        ? {
            schoolName: opts.schoolContext.schoolName,
            totalSeats: opts.schoolContext.totalSeats,
          }
        : {}),
    },
    type
  )
}

export async function notifyPaymentReceipt(
  userId: string,
  opts: {
    plan?: string
    status?: string
    nextBillingDate?: string
    invoiceId?: string
    invoiceUrl?: string
    invoiceAmount?: string
    invoiceDate?: string
    invoiceNumber?: string
    schoolContext?: SchoolContext
  } = {}
): Promise<void> {
  const userInfo = await getUserEmailAndLocale(userId)
  if (!userInfo?.email) return

  const appUrl = process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000"

  let attachments: { filename: string; content: string; type?: string }[] | undefined

  if (opts.invoiceUrl) {
    try {
      const response = await fetch(opts.invoiceUrl)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        attachments = [
          {
            filename: `receipt-${opts.invoiceNumber || "invoice"}.pdf`,
            content: Buffer.from(arrayBuffer).toString("base64"),
            type: "application/pdf",
          },
        ]
      }
    } catch (error) {
      console.error("[subscription-email] Failed to fetch invoice PDF:", error)
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
      invoiceUrl: opts.invoiceUrl,
      invoiceAmount: opts.invoiceAmount,
      invoiceDate: opts.invoiceDate,
      invoiceNumber: opts.invoiceNumber,
      ...(opts.schoolContext
        ? {
            schoolName: opts.schoolContext.schoolName,
            totalSeats: opts.schoolContext.totalSeats,
          }
        : {}),
    },
    "payment_receipt",
    attachments
  )
}
