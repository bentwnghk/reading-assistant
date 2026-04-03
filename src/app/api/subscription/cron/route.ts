import { ensureSubscriptionTable } from "@/lib/subscription"
import { ensureSchoolSubscriptionTables } from "@/lib/school-subscription"
import {
  notifySubscriptionEvent,
  getSchoolContext,
} from "@/lib/subscription-email"
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

async function processTrialEndingNotifications(client: Awaited<ReturnType<typeof getClient>>) {
  let processed = 0
  let notified = 0
  let errors = 0

  const result = await client.query(
    `SELECT s.user_id, s.plan, s.trial_end, s.status
     FROM subscriptions s
     WHERE s.status = 'trialing'
       AND s.trial_end IS NOT NULL
       AND s.trial_end > NOW()
       AND s.trial_end <= NOW() + INTERVAL '6 hours'
       AND NOT EXISTS (
         SELECT 1 FROM email_reminder_logs erl
         WHERE erl.user_id = s.user_id
           AND erl.last_activity_type = 'trial_ending_notification'
           AND erl.sent_at > NOW() - INTERVAL '24 hours'
       )`
  )

  for (const row of result.rows) {
    processed++
    try {
      await notifySubscriptionEvent(row.user_id, "trial_ending", {
        plan: row.plan || "monthly",
        status: row.status,
        trialEndDate: new Date(row.trial_end).toLocaleDateString(),
      })

      await client.query(
        `INSERT INTO email_reminder_logs (user_id, days_inactive, last_activity_type, last_activity_at)
         VALUES ($1, 0, 'trial_ending_notification', NOW())`,
        [row.user_id]
      )
      notified++
    } catch {
      errors++
    }
  }

  return { processed, notified, errors }
}

async function processSchoolTrialEndingNotifications(client: Awaited<ReturnType<typeof getClient>>) {
  let processed = 0
  let notified = 0
  let errors = 0

  const result = await client.query(
    `SELECT ss.admin_user_id, ss.school_id, ss.plan, ss.trial_end, ss.status
     FROM school_subscriptions ss
     WHERE ss.status = 'trialing'
       AND ss.trial_end IS NOT NULL
       AND ss.trial_end > NOW()
       AND ss.trial_end <= NOW() + INTERVAL '6 hours'
       AND NOT EXISTS (
         SELECT 1 FROM email_reminder_logs erl
         WHERE erl.user_id = ss.admin_user_id
           AND erl.last_activity_type = 'school_trial_ending_notification'
           AND erl.sent_at > NOW() - INTERVAL '24 hours'
       )`
  )

  for (const row of result.rows) {
    processed++
    try {
      const schoolCtx = await getSchoolContext(row.school_id)

      await notifySubscriptionEvent(row.admin_user_id, "trial_ending", {
        plan: row.plan || "monthly",
        status: row.status,
        trialEndDate: new Date(row.trial_end).toLocaleDateString(),
        schoolContext: schoolCtx || undefined,
      })

      await client.query(
        `INSERT INTO email_reminder_logs (user_id, days_inactive, last_activity_type, last_activity_at)
         VALUES ($1, 0, 'school_trial_ending_notification', NOW())`,
        [row.admin_user_id]
      )
      notified++
    } catch {
      errors++
    }
  }

  return { processed, notified, errors }
}

async function processRenewalReminders(client: Awaited<ReturnType<typeof getClient>>) {
  let processed = 0
  let notified = 0
  let errors = 0

  const result = await client.query(
    `SELECT s.user_id, s.plan, s.current_period_end, s.status, s.cancel_at_period_end
     FROM subscriptions s
     WHERE s.status IN ('active', 'trialing')
       AND s.current_period_end IS NOT NULL
       AND s.current_period_end > NOW() + INTERVAL '6 days 23 hours'
       AND s.current_period_end <= NOW() + INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM email_reminder_logs erl
         WHERE erl.user_id = s.user_id
           AND erl.last_activity_type = 'renewal_reminder'
           AND erl.sent_at > NOW() - INTERVAL '24 hours'
       )`
  )

  for (const row of result.rows) {
    processed++
    try {
      await notifySubscriptionEvent(row.user_id, "renewal_reminder", {
        plan: row.plan || "monthly",
        status: row.status,
        nextBillingDate: new Date(row.current_period_end).toLocaleDateString(),
        cancelAtPeriodEnd: row.cancel_at_period_end,
      })

      await client.query(
        `INSERT INTO email_reminder_logs (user_id, days_inactive, last_activity_type, last_activity_at)
         VALUES ($1, 0, 'renewal_reminder', NOW())`,
        [row.user_id]
      )
      notified++
    } catch {
      errors++
    }
  }

  return { processed, notified, errors }
}

async function processSchoolRenewalReminders(client: Awaited<ReturnType<typeof getClient>>) {
  let processed = 0
  let notified = 0
  let errors = 0

  const result = await client.query(
    `SELECT ss.admin_user_id, ss.school_id, ss.plan, ss.current_period_end, ss.status, ss.cancel_at_period_end
     FROM school_subscriptions ss
     WHERE ss.status IN ('active', 'trialing')
       AND ss.current_period_end IS NOT NULL
       AND ss.current_period_end > NOW() + INTERVAL '6 days 23 hours'
       AND ss.current_period_end <= NOW() + INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM email_reminder_logs erl
         WHERE erl.user_id = ss.admin_user_id
           AND erl.last_activity_type = 'school_renewal_reminder'
           AND erl.sent_at > NOW() - INTERVAL '24 hours'
       )`
  )

  for (const row of result.rows) {
    processed++
    try {
      const schoolCtx = await getSchoolContext(row.school_id)

      await notifySubscriptionEvent(row.admin_user_id, "renewal_reminder", {
        plan: row.plan || "monthly",
        status: row.status,
        nextBillingDate: new Date(row.current_period_end).toLocaleDateString(),
        cancelAtPeriodEnd: row.cancel_at_period_end,
        schoolContext: schoolCtx || undefined,
      })

      await client.query(
        `INSERT INTO email_reminder_logs (user_id, days_inactive, last_activity_type, last_activity_at)
         VALUES ($1, 0, 'school_renewal_reminder', NOW())`,
        [row.admin_user_id]
      )
      notified++
    } catch {
      errors++
    }
  }

  return { processed, notified, errors }
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureSubscriptionTable()
    await ensureSchoolSubscriptionTables()

    const client = await getClient()
    const results: Record<string, { processed: number; notified: number; errors: number }> = {}

    try {
      results.trialEndingPersonal = await processTrialEndingNotifications(client)
      results.trialEndingSchool = await processSchoolTrialEndingNotifications(client)
      results.renewalReminderPersonal = await processRenewalReminders(client)
      results.renewalReminderSchool = await processSchoolRenewalReminders(client)
    } finally {
      client.release()
    }

    const totalProcessed = Object.values(results).reduce((s, r) => s + r.processed, 0)
    const totalNotified = Object.values(results).reduce((s, r) => s + r.notified, 0)
    const totalErrors = Object.values(results).reduce((s, r) => s + r.errors, 0)

    console.log(
      `[subscription-cron] Results: ${JSON.stringify(results)}, total: processed=${totalProcessed}, notified=${totalNotified}, errors=${totalErrors}`
    )

    return NextResponse.json({ results, totalProcessed, totalNotified, totalErrors })
  } catch (error) {
    console.error("[subscription-cron] Error:", error)
    return NextResponse.json(
      { error: "Failed to process subscription notifications", detail: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
