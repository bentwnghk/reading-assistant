import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getPresetForViewer } from "@/lib/assignment-presets"
import { getTeacherDashboardDataForStudents } from "@/lib/users"
import { getReviewSessionsForUsers, getVocabularyCountsForUsers } from "@/lib/vocabulary"
import { getSkillAveragesForUsers } from "@/lib/skill-profile"

/**
 * GET /api/assignments/presets/[id]/dashboard
 *
 * Teacher-dashboard data for a saved roster's students — same response
 * shape as /api/classes/[id]/dashboard. Lets teachers chart students who
 * are on the roster but not in any of their own classes (assignment
 * sessions stay visible to the assigning teacher via the visibility SQL).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  try {
    const preset = await getPresetForViewer(id, session.user.id, role)
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }

    const sessions = await getTeacherDashboardDataForStudents(
      preset.studentIds,
      session.user.id,
    )

    const userIds = [...new Set(sessions.map((s) => s.userId))]
    const [reviewSessions, vocabCounts, skillAverages] = await Promise.all([
      getReviewSessionsForUsers(userIds),
      getVocabularyCountsForUsers(userIds),
      getSkillAveragesForUsers(userIds),
    ])

    return NextResponse.json({
      sessions,
      reviewSessions,
      vocabCounts: Object.fromEntries(vocabCounts),
      skillAverages,
    })
  } catch (error) {
    console.error("Failed to get preset dashboard data:", error)
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 })
  }
}
