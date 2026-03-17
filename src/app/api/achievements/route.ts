import { auth } from "@/auth"
import { getAchievementProgress } from "@/lib/achievements"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const achievements = await getAchievementProgress(session.user.id)
    return NextResponse.json(achievements)
  } catch (error) {
    console.error("[achievements] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    )
  }
}
