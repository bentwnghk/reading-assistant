import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStudentSessions, canAccessClass } from "@/lib/users"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: classId, studentId } = await params

  // Verify the caller can access this class (school-scoped for teachers)
  if (!await canAccessClass(session.user.id, session.user.role, classId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const sessions = await getStudentSessions(studentId)
    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Failed to get student sessions:", error)
    return NextResponse.json({ error: "Failed to get student sessions" }, { status: 500 })
  }
}
