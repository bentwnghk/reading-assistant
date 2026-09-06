import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStudentSessions, canAccessStudent } from "@/lib/users"
import { getSpellingReviewSessionCount } from "@/lib/vocabulary"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "super-admin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: userId } = await params

  // Admins are school-scoped (same school as the target user); super-admins
  // can access any user.
  if (!await canAccessStudent(session.user.id, session.user.role, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const [sessions, spellingReviewCount] = await Promise.all([
      getStudentSessions(userId),
      getSpellingReviewSessionCount(userId),
    ])
    return NextResponse.json({ sessions, spellingReviewCount })
  } catch (error) {
    console.error("Failed to get user sessions:", error)
    return NextResponse.json({ error: "Failed to get user sessions" }, { status: 500 })
  }
}
