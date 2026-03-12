import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  canAccessClass,
  getClassMembers,
  getSchoolForUser,
  getUsersInSchool,
  getAllUsers,
} from "@/lib/users"

/**
 * GET /api/classes/[id]/available-students
 *
 * Returns students who can be added to this class:
 * - For teachers/admins with a school: students from the same school who are not already members
 * - For admins without a school (edge case): all students not already members
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (!await canAccessClass(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const [members, callerSchoolId] = await Promise.all([
      getClassMembers(id),
      getSchoolForUser(session.user.id),
    ])

    const memberIds = new Set(members.map(m => m.studentId))

    let candidates
    if (callerSchoolId) {
      candidates = await getUsersInSchool(callerSchoolId)
    } else {
      // Admin with no school assigned — fall back to all users
      candidates = await getAllUsers()
    }

    const available = candidates.filter(u => u.role === "student" && !memberIds.has(u.id))
    return NextResponse.json(available)
  } catch (error) {
    console.error("Failed to get available students:", error)
    return NextResponse.json({ error: "Failed to get available students" }, { status: 500 })
  }
}
