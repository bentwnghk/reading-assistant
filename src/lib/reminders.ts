import { getClient } from "./db"
import { sendEmail, isMailtrapConfigured } from "./email"
import {
  buildReminderEmailHtml,
  buildReminderEmailText,
  getActivityDisplayName,
} from "@/templates/reminder-email"
import crypto from "crypto"

export interface InactiveUser {
  id: string
  name: string | null
  email: string | null
  lastActivityType: string | null
  lastActivityAt: Date | null
  daysInactive: number
}

export interface ReminderPreference {
  enabled: boolean
  frequencyDays: number
}

let tablesEnsured = false

export async function ensureReminderTables(): Promise<boolean> {
  if (tablesEnsured) return true
  const client = await getClient()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_reminder_logs (
        id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sent_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        days_inactive       INTEGER NOT NULL,
        last_activity_type  TEXT,
        last_activity_at    TIMESTAMP WITH TIME ZONE
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_user
        ON email_reminder_logs(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_sent
        ON email_reminder_logs(sent_at DESC)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_reminder_preferences (
        user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        enabled         BOOLEAN NOT NULL DEFAULT true,
        frequency_days  INTEGER NOT NULL DEFAULT 3 CHECK (frequency_days >= 1),
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_reminder_preferences_user
        ON email_reminder_preferences(user_id)
    `)

    tablesEnsured = true
    return true
  } catch (error) {
    console.error("[reminders] Failed to ensure tables:", error)
    return false
  } finally {
    client.release()
  }
}

export async function getInactiveUsers(daysThreshold: number): Promise<InactiveUser[]> {
  const client = await getClient()
  try {
    const intervalStr = `${daysThreshold} days`

    const result = await client.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        last_act.activity_type  AS last_activity_type,
        last_act.created_at     AS last_activity_at,
        EXTRACT(DAY FROM NOW() - last_act.created_at)::INTEGER AS days_inactive
      FROM users u
      INNER JOIN LATERAL (
        SELECT al.activity_type, al.created_at
        FROM activity_logs al
        WHERE al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 1
      ) last_act ON true
      WHERE u."emailVerified" IS NOT NULL
        AND u.email IS NOT NULL
        AND last_act.created_at < NOW() - $1::INTERVAL
        AND (
          NOT EXISTS (
            SELECT 1 FROM email_reminder_preferences erp
            WHERE erp.user_id = u.id AND erp.enabled = false
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_reminder_logs erl
          WHERE erl.user_id = u.id
            AND erl.sent_at > NOW() - $1::INTERVAL
        )
      ORDER BY last_act.created_at ASC
      `,
      [intervalStr]
    )

    console.log(`[reminders] getInactiveUsers(${daysThreshold}): found ${result.rows.length} users`)

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      lastActivityType: row.last_activity_type,
      lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
      daysInactive: row.days_inactive || daysThreshold,
    }))
  } finally {
    client.release()
  }
}

export async function recordReminderSent(
  userId: string,
  daysInactive: number,
  lastActivityType: string | null,
  lastActivityAt: Date | null
): Promise<void> {
  const client = await getClient()
  try {
    await client.query(
      `INSERT INTO email_reminder_logs (user_id, days_inactive, last_activity_type, last_activity_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, daysInactive, lastActivityType, lastActivityAt]
    )
  } catch (error) {
    console.error("[reminders] Failed to record reminder sent:", error)
  } finally {
    client.release()
  }
}

export async function getReminderPreference(userId: string): Promise<ReminderPreference> {
  const client = await getClient()
  try {
    const result = await client.query(
      "SELECT enabled, frequency_days FROM email_reminder_preferences WHERE user_id = $1",
      [userId]
    )
    if (result.rows.length === 0) {
      return { enabled: true, frequencyDays: 3 }
    }
    return {
      enabled: result.rows[0].enabled,
      frequencyDays: result.rows[0].frequency_days,
    }
  } catch (error) {
    console.error("[reminders] Failed to get preference:", error)
    return { enabled: true, frequencyDays: 3 }
  } finally {
    client.release()
  }
}

export async function setReminderPreference(
  userId: string,
  enabled: boolean,
  frequencyDays: number
): Promise<void> {
  const client = await getClient()
  try {
    await client.query(
      `INSERT INTO email_reminder_preferences (user_id, enabled, frequency_days)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET enabled = $2, frequency_days = $3, updated_at = NOW()`,
      [userId, enabled, frequencyDays]
    )
  } finally {
    client.release()
  }
}

export function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.AUTH_SECRET || process.env.CRON_SECRET || "reminder-secret"
  return crypto.createHmac("sha256", secret).update(userId).digest("hex")
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId)
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}

export async function sendReminderEmail(user: InactiveUser): Promise<boolean> {
  if (!isMailtrapConfigured()) {
    console.warn("[reminders] Mailtrap not configured, skipping email")
    return false
  }

  if (!user.email) return false

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  const unsubscribeToken = generateUnsubscribeToken(user.id)
  const unsubscribeUrl = `${appUrl}/api/reminders/preferences?unsubscribe=1&uid=${user.id}&token=${unsubscribeToken}`

  const lastActivityDate = user.lastActivityAt
    ? user.lastActivityAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "recently"

  const html = buildReminderEmailHtml({
    userName: user.name || "",
    daysInactive: user.daysInactive,
    lastActivityDate,
    lastActivityType: user.lastActivityType || "session_create",
    appUrl,
    unsubscribeUrl,
  })

  const text = buildReminderEmailText({
    userName: user.name || "",
    daysInactive: user.daysInactive,
    lastActivityDate,
    lastActivityType: user.lastActivityType || "session_create",
    appUrl,
    unsubscribeUrl,
  })

  const activityName = getActivityDisplayName(user.lastActivityType || "session_create")
  const dayText = user.daysInactive === 1 ? "1 day" : `${user.daysInactive} days`

  try {
    await sendEmail({
      to: [{ email: user.email, name: user.name || undefined }],
      subject: `We miss you! It's been ${dayText} since you ${activityName}`,
      html,
      text,
      category: "reminder",
    })
    return true
  } catch (error) {
    console.error(`[reminders] Failed to send to ${user.email}:`, error)
    return false
  }
}

export async function processReminders(daysThreshold: number = 3): Promise<{
  processed: number
  sent: number
  errors: number
}> {
  const users = await getInactiveUsers(daysThreshold)

  let sent = 0
  let errors = 0

  for (const user of users) {
    try {
      const success = await sendReminderEmail(user)
      if (success) {
        await recordReminderSent(
          user.id,
          user.daysInactive,
          user.lastActivityType,
          user.lastActivityAt
        )
        sent++
      } else {
        errors++
      }
    } catch {
      errors++
    }
  }

  return { processed: users.length, sent, errors }
}
