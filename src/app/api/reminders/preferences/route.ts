import { auth } from "@/auth"
import {
  ensureReminderTables,
  getReminderPreference,
  setReminderPreference,
  verifyUnsubscribeToken,
} from "@/lib/reminders"
import { NextResponse } from "next/server"
import { z } from "zod"

const PreferenceSchema = z.object({
  enabled: z.boolean(),
  frequencyDays: z.number().int().min(1).max(30),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const isUnsubscribe = searchParams.get("unsubscribe") === "1"
    const userId = searchParams.get("uid")
    const token = searchParams.get("token")

    if (isUnsubscribe && userId && token) {
      await ensureReminderTables()

      if (!verifyUnsubscribeToken(userId, token)) {
        return NextResponse.redirect(
          new URL("/?unsubscribe=invalid", request.url)
        )
      }

      await setReminderPreference(userId, false, 3)

      const appUrl = process.env.APP_URL || new URL("/", request.url).origin

      return NextResponse.redirect(
        new URL("/?unsubscribe=success", appUrl)
      )
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureReminderTables()
    const preference = await getReminderPreference(session.user.id)

    return NextResponse.json(preference)
  } catch (error) {
    console.error("[reminders/preferences] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = PreferenceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await ensureReminderTables()
    await setReminderPreference(
      session.user.id,
      parsed.data.enabled,
      parsed.data.frequencyDays
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[reminders/preferences] PUT error:", error)
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    )
  }
}
