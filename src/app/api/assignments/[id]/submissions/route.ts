import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAssignmentRoster } from "@/lib/assignments"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only teachers/admins/super-admins can view the full roster.
    // Students use the /api/assignments/student/[id] endpoint to view their own.
    const role = session.user.role
    if (role !== "teacher" && role !== "admin" && role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const roster = await getAssignmentRoster(id, session.user.id, role)
    if (!roster) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }
    return NextResponse.json(roster)
  } catch (error) {
    console.error("Error fetching assignment roster:", error)
    return NextResponse.json({ error: "Failed to fetch roster" }, { status: 500 })
  }
}
