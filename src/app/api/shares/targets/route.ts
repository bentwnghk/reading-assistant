import { auth } from "@/auth"
import { getShareTargets } from "@/lib/shared-sessions"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role as "admin" | "teacher" | "student" | "super-admin"
    if (!["super-admin", "admin", "teacher", "student"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const targets = await getShareTargets(session.user.id, role)
    return NextResponse.json(targets)
  } catch (error) {
    console.error("Error fetching share targets:", error)
    return NextResponse.json(
      { error: "Failed to fetch share targets" },
      { status: 500 }
    )
  }
}
