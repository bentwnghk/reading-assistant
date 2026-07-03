import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getOverdueAssignmentCount } from "@/lib/assignments"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "student") {
      return NextResponse.json({ count: 0 })
    }
    const count = await getOverdueAssignmentCount(session.user.id)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error fetching overdue assignment count:", error)
    return NextResponse.json(
      { error: "Failed to fetch overdue assignment count" },
      { status: 500 },
    )
  }
}
