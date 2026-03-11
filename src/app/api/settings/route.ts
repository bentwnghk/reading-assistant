import { auth } from "@/auth"
import { getUserSettings, upsertUserSettings, ensureSettingsTable } from "@/lib/settings"
import { NextResponse } from "next/server"
import type { SettingStore } from "@/store/setting"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureSettingsTable()
    const settings = await getUserSettings(session.user.id)
    return NextResponse.json(settings || {})
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
