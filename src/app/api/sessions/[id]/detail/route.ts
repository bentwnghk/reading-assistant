import { auth } from "@/auth"
import { getStudentSessionDetail, canAccessStudent, canViewStudentSession } from "@/lib/users"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const detail = await getStudentSessionDetail(params.id)
    if (!detail) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const allowed = role === "teacher"
      ? await canViewStudentSession(session.user.id, role, params.id)
      : await canAccessStudent(session.user.id, role, detail.userId)
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error("Error fetching session detail:", error)
    return NextResponse.json(
      { error: "Failed to fetch session detail" },
      { status: 500 }
    )
  }
}
