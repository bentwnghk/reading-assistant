import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSchoolForUser, getUsersInSchool, getAllSchools } from "@/lib/users"
import type { ShareTargetGroup, ShareTarget } from "@/lib/shared-sessions"

/**
 * GET /api/assignments/targets
 *
 * Resolves students who can be added to a new assignment:
 *   - super-admin: any student across all schools, grouped by school/class
 *   - admin: students in the admin's school, grouped by class
 *   - teacher: students in the teacher's school (NOT restricted to classes they
 *     own — this is the LxC use case where a non-English teacher has no class).
 *
 * Students are filtered by role === 'student' and exclude the requester.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "teacher" && role !== "admin" && role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (role === "super-admin") {
      const schools = await getAllSchools()
      const result: ShareTargetGroup[] = []
      for (const school of schools) {
        const users = await getUsersInSchool(school.id)
        const targets: ShareTarget[] = users
          .filter((u) => u.id !== session.user.id && u.role === "student")
          .map((u) => ({
            id: u.id,
            name: u.name ?? null,
            email: u.email ?? null,
            classId: u.classId ?? undefined,
            className: u.className ?? undefined,
            schoolId: school.id,
            schoolName: school.name,
          }))
        if (targets.length === 0) continue
        result.push(...groupByClass(targets, school.id, school.name))
      }
      return NextResponse.json(result)
    }

    const schoolId = await getSchoolForUser(session.user.id)
    if (!schoolId) return NextResponse.json([])

    const users = await getUsersInSchool(schoolId)
    const schoolName = users.find((u) => u.schoolId === schoolId)?.schoolName
    const targets: ShareTarget[] = users
      .filter((u) => u.id !== session.user.id && u.role === "student")
      .map((u) => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        classId: u.classId ?? undefined,
        className: u.className ?? undefined,
        schoolId,
        schoolName,
      }))

    return NextResponse.json(groupByClass(targets, schoolId, schoolName))
  } catch (error) {
    console.error("Error fetching assignment targets:", error)
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 })
  }
}

function groupByClass(
  targets: ShareTarget[],
  schoolId?: string,
  schoolName?: string,
): ShareTargetGroup[] {
  const groups: Record<string, ShareTarget[]> = {}
  const ungrouped: ShareTarget[] = []
  for (const t of targets) {
    if (t.classId && t.className) {
      if (!groups[t.classId]) groups[t.classId] = []
      groups[t.classId].push(t)
    } else {
      ungrouped.push(t)
    }
  }
  const result: ShareTargetGroup[] = []
  for (const [classId, users] of Object.entries(groups)) {
    result.push({
      classId,
      className: users[0].className,
      schoolId,
      schoolName,
      label: users[0].className || classId,
      users,
    })
  }
  if (ungrouped.length > 0) {
    result.push({ schoolId, schoolName, label: "Other", users: ungrouped })
  }
  return result
}
