import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAssignment, markSubmissionViewed } from "@/lib/assignments"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify the student actually has access to this assignment
    const assignment = await getAssignment(id, session.user.id, session.user.role)
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    await markSubmissionViewed(id, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking submission viewed:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
