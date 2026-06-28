import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStudentSubmissionSession } from "@/lib/assignments"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "teacher" && role !== "admin" && role !== "super-admin" && role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, studentId } = await params
    const result = await getStudentSubmissionSession(
      id,
      studentId,
      session.user.id,
      role,
    )
    if (!result) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching student submission:", error)
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 })
  }
}
