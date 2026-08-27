import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherDashboardData, getTeacherDashboardDataForClasses, getTeacherDashboardDataForSchool, getTeacherDashboardDataAllSchools, canAccessClass, getClassesForTeacher, getSchoolForUser } from "@/lib/users"
import { getReviewSessionsForUsers, getVocabularyCountsForUsers } from "@/lib/vocabulary"
import { getSkillAveragesForUsers } from "@/lib/skill-profile"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get("schoolId")

  try {
    let sessions: Awaited<ReturnType<typeof getTeacherDashboardData>> = []

    if (id === "all") {
      if (role === "super-admin") {
        if (schoolId && schoolId !== "all") {
          sessions = await getTeacherDashboardDataForSchool(schoolId)
        } else {
          sessions = await getTeacherDashboardDataAllSchools()
        }
      } else if (role === "admin") {
        const userSchoolId = await getSchoolForUser(session.user.id)
        if (!userSchoolId) {
          return NextResponse.json({ error: "No school assigned" }, { status: 400 })
        }
        sessions = await getTeacherDashboardDataForSchool(userSchoolId)
      } else {
        // Teachers: only their own classes, with session-visibility applied.
        const teacherClasses = await getClassesForTeacher(session.user.id)
        sessions = await getTeacherDashboardDataForClasses(
          teacherClasses.map((c) => c.id),
          session.user.id
        )
      }
    } else {
      if (!await canAccessClass(session.user.id, role, id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      sessions = await getTeacherDashboardData(id, { id: session.user.id, role })
    }

    const userIds = [...new Set(sessions.map((s) => s.userId))]
    const [reviewSessions, vocabCounts, skillAverages] = await Promise.all([
      getReviewSessionsForUsers(userIds),
      getVocabularyCountsForUsers(userIds),
      getSkillAveragesForUsers(userIds),
    ])

    return NextResponse.json({ sessions, reviewSessions, vocabCounts: Object.fromEntries(vocabCounts), skillAverages })
  } catch (error) {
    console.error("Failed to get teacher dashboard data:", error)
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 })
  }
}
