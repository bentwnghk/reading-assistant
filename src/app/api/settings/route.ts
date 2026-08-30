import { auth } from "@/auth"
import { getUserSettings, upsertUserSettings, ensureSettingsTable } from "@/lib/settings"
import { applyFreeAccessSettings } from "@/lib/free-access"
import { NextResponse } from "next/server"
import type { SettingStore } from "@/store/setting"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureSettingsTable()
    const stored = await getUserSettings(session.user.id)
    // Users whose email matches FREE_ACCESS_EMAILS are defaulted onto Free
    // (proxy) billing mode. No password is injected — AI access is granted
    // identity-bound via a session-bound ticket cookie issued by
    // /api/free-access/ticket, so the shared password never reaches clients.
    // Persist the mode change so admin views (billing badge) stay consistent.
    const { settings, changed } = applyFreeAccessSettings(
      stored ?? {},
      session.user.email
    )
    if (changed) {
      await upsertUserSettings(session.user.id, settings)
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
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

    await ensureSettingsTable()
    const settings = (await request.json()) as Partial<SettingStore>
    const success = await upsertUserSettings(session.user.id, settings)
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}
