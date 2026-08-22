import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClient } from "@/lib/db"
import {
  canAccessClass,
  getClassMembers,
  getClassSchoolId,
  getSchoolForUser,
  getUsersInSchool,
  getAllUsers,
} from "@/lib/users"

async function getAssignedStudentIds(): Promise<Set<string>> {
  const client = await getClient()
  try {
    const result = await client.query('SELECT DISTINCT student_id FROM class_members')
    return new Set(result.rows.map(r => r.student_id))
  } finally {
    client.release()
  }
}

/**
 * GET /api/classes/[id]/available-students
 *
 * Returns students who can be added to this class:
 * - Candidates are taken from the CLASS's school (so a super-admin managing a class
 *   in school X only sees students from school X).
 * - If the class has no school, falls back to the caller's school, then to all users.
 * - Excludes students who are already members of this class or any other class
 *   (a student may belong to at most one class).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "super-admin" && session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (!await canAccessClass(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const [members, classSchoolId, callerSchoolId, assignedStudentIds] = await Promise.all([
      getClassMembers(id),
      getClassSchoolId(id),
      getSchoolForUser(session.user.id),
      getAssignedStudentIds(),
    ])

    const memberIds = new Set(members.map(m => m.studentId))

    // Prefer the class's school; fall back to caller's school, then to all users
    // for orphan classes managed by a school-less super-admin.
    const scopeSchoolId = classSchoolId ?? callerSchoolId
    const candidates = scopeSchoolId
      ? await getUsersInSchool(scopeSchoolId)
      : await getAllUsers()

    const available = candidates.filter(u =>
      u.role === "student" &&
      !u.banned &&
      !memberIds.has(u.id) &&
      !assignedStudentIds.has(u.id)
    )
    return NextResponse.json(available)
  } catch (error) {
    console.error("Failed to get available students:", error)
    return NextResponse.json({ error: "Failed to get available students" }, { status: 500 })
  }
}
