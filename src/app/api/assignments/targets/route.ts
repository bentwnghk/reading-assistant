import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSchoolForUser, getUsersInSchool, getAllSchools, getClassesForTeacher, getClassMembers } from "@/lib/users"
import { decorateGroupsWithClassMeta } from "@/lib/shared-sessions"
import type { ShareTargetGroup, ShareTarget } from "@/lib/shared-sessions"

/**
 * GET /api/assignments/targets
 *
 * Resolves students who can be added to a new assignment:
 *   - super-admin: any student across all schools, grouped by school/class
 *   - admin: students in the admin's school, grouped by class
 *   - teacher: students in the classes the teacher owns (one group per class,
 *     mirroring getShareTargets in shared-sessions.ts).
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
        const targets: ShareTarget[] = []
        for (const u of users) {
          if (u.id === session.user.id || u.role !== "student" || u.banned) continue
          for (const t of expandUserClasses(u)) {
            targets.push({ ...t, schoolId: school.id, schoolName: school.name })
          }
        }
        if (targets.length === 0) continue
        result.push(...groupByClass(targets, school.id, school.name))
      }
      return NextResponse.json(await decorateGroupsWithClassMeta(result))
    }

    if (role === "teacher") {
      const classes = await getClassesForTeacher(session.user.id)
      const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name))
      const result: ShareTargetGroup[] = []

      for (const cls of sortedClasses) {
        const members = await getClassMembers(cls.id)
        const targets: ShareTarget[] = members.map((m) => ({
          id: m.studentId,
          name: m.studentName ?? null,
          email: m.studentEmail ?? null,
          classId: cls.id,
          className: cls.name,
        }))
        if (targets.length > 0) {
          result.push({
            classId: cls.id,
            className: cls.name,
            subjectName: cls.subjectName,
            gradeName: cls.gradeName,
            label: cls.name,
            users: targets,
          })
        }
      }
      return NextResponse.json(result)
    }

    const schoolId = await getSchoolForUser(session.user.id)
    if (!schoolId) return NextResponse.json([])

    const users = await getUsersInSchool(schoolId)
    const schoolName = users.find((u) => u.schoolId === schoolId)?.schoolName
    const targets: ShareTarget[] = []
    for (const u of users) {
      if (u.id === session.user.id || u.role !== "student" || u.banned) continue
      for (const t of expandUserClasses(u)) {
        targets.push({ ...t, schoolId, schoolName })
      }
    }

    return NextResponse.json(await decorateGroupsWithClassMeta(groupByClass(targets, schoolId, schoolName)))
  } catch (error) {
    console.error("Error fetching assignment targets:", error)
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 })
  }
}

// Expands one user into N share targets (one per class membership).
// Users without a class produce a single classless target.
function expandUserClasses(u: {
  id: string
  name?: string | null
  email?: string | null
  classId?: string
  className?: string
  classIds?: string[]
  classNames?: string[]
}): ShareTarget[] {
  const ids = u.classIds && u.classIds.length > 0 ? u.classIds : (u.classId ? [u.classId] : [])
  const names = u.classNames && u.classNames.length > 0 ? u.classNames : (u.className ? [u.className] : [])
  if (ids.length === 0) {
    return [{ id: u.id, name: u.name ?? null, email: u.email ?? null }]
  }
  return ids.map((classId, i) => ({
    id: u.id,
    name: u.name ?? null,
    email: u.email ?? null,
    classId,
    className: names[i] ?? classId,
  }))
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
  for (const [classId, users] of Object.entries(groups).sort((a, b) => {
    const aName = a[1][0]?.className ?? a[0]
    const bName = b[1][0]?.className ?? b[0]
    return aName.localeCompare(bName)
  })) {
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
