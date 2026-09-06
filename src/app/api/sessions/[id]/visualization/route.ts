import { auth } from "@/auth"
import { getSessionVisualization, canAccessStudent, canViewStudentSession } from "@/lib/users"
import { NextRequest, NextResponse } from "next/server"

/** Serves the (potentially multi-MB base64) visualization image on demand,
 *  with the same access control as /api/sessions/[id]/detail. */
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

    const viz = await getSessionVisualization(params.id)
    if (!viz) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const allowed = role === "teacher"
      ? await canViewStudentSession(session.user.id, role, params.id)
      : await canAccessStudent(session.user.id, role, viz.userId)
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ image: viz.image })
  } catch (error) {
    console.error("Error fetching session visualization:", error)
    return NextResponse.json(
      { error: "Failed to fetch session visualization" },
      { status: 500 }
    )
  }
}
