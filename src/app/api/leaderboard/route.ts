import { auth } from "@/auth"
import {
  getLeaderboard,
  getAllTimeLeaderboard,
  refreshWeeklyStatsForUser,
  refreshAllTimeStatsForUser,
  type LeaderboardScope,
  type LeaderboardPeriod,
  type SortColumn,
  type AllTimeSortColumn,
} from "@/lib/leaderboard"
import { getWeekStart } from "@/lib/activity"
import { getStudentClassId, getClassesForTeacher, getClassesForSchool, getSchoolForUser, getAllClasses } from "@/lib/users"
import { NextResponse } from "next/server"

// GET /api/leaderboard?scope=class|school|global&period=weekly|all-time&classId=...&schoolId=...&week=YYYY-MM-DD&sortBy=...&limit=50
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scopeParam  = (searchParams.get("scope") ?? "class") as LeaderboardScope
    const periodParam = (searchParams.get("period") ?? "weekly") as LeaderboardPeriod
    const classId     = searchParams.get("classId") ?? undefined
    const schoolId    = searchParams.get("schoolId") ?? undefined
    const weekParam   = searchParams.get("week")
    const limit       = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)

    const isAllTime = periodParam === "all-time"
    // Validate sort column against the active period's allowed set. The sortBy
    // value is interpolated into ORDER BY, so it must match a known column.
    const sortByParam = (() => {
      if (isAllTime) {
        return (searchParams.get("sortBy") ?? "all_time_score") as AllTimeSortColumn
      }
      return (searchParams.get("sortBy") ?? "weekly_score") as SortColumn
    })()

    const weekStart = weekParam ? new Date(weekParam) : getWeekStart()

    const userId = session.user.id
    const userRole = session.user.role

    // Always refresh the requesting user's own stats so their latest activity
    // (quiz, test, spelling, flashcards) shows up immediately.
    if (isAllTime) {
      await refreshAllTimeStatsForUser(userId)
    } else {
      await refreshWeeklyStatsForUser(userId, weekStart)
    }

    let resolvedClassId  = classId
    let resolvedClassIds: string[] | undefined
    let resolvedSchoolId = schoolId
    let resolvedScope    = scopeParam

    // Auto-resolve class when none is supplied explicitly.
    // For students: use their class membership.
    // For super-admins: use ALL classes across all schools.
    // For admins: use ALL classes in their school.
    // For teachers: use ALL classes they teach.
    if (resolvedScope === "class" && !resolvedClassId) {
      const studentClassId = await getStudentClassId(userId)
      if (studentClassId) {
        resolvedClassId = studentClassId
      } else if (userRole === "super-admin") {
        const allClasses = await getAllClasses()
        if (allClasses.length > 0) {
          resolvedClassIds = allClasses.map(c => c.id)
        }
      } else if (userRole === "admin") {
        const adminSchoolId = await getSchoolForUser(userId)
        if (adminSchoolId) {
          const schoolClasses = await getClassesForSchool(adminSchoolId)
          if (schoolClasses.length > 0) {
            resolvedClassIds = schoolClasses.map(c => c.id)
          }
        }
      } else {
        const teacherClasses = await getClassesForTeacher(userId)
        if (teacherClasses.length > 0) {
          resolvedClassIds = teacherClasses.map(c => c.id)
        }
      }
    }

    // Auto-resolve school from the user's own profile when no schoolId is supplied
    if (resolvedScope === "school" && !resolvedSchoolId) {
      resolvedSchoolId = (await getSchoolForUser(userId)) ?? undefined
      if (!resolvedSchoolId) {
        // User has no school — fall back to global
        resolvedScope = "global"
      }
    }

    const data = isAllTime
      ? await getAllTimeLeaderboard(userId, {
          scope:    resolvedScope,
          classId:  resolvedClassId,
          classIds: resolvedClassIds,
          schoolId: resolvedSchoolId,
          sortBy:   sortByParam as AllTimeSortColumn,
          limit,
        })
      : await getLeaderboard(userId, {
          scope:    resolvedScope,
          classId:  resolvedClassId,
          classIds: resolvedClassIds,
          schoolId: resolvedSchoolId,
          weekStart,
          sortBy:   sortByParam as SortColumn,
          limit,
        })

    return NextResponse.json(data)
  } catch (error) {
    console.error("[leaderboard] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    )
  }
}
