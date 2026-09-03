import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getPresetForViewer } from "@/lib/assignment-presets"
import { getStudentSessionsForStudentIds } from "@/lib/users"
import { getSpellingReviewSessionCountsForUsers } from "@/lib/vocabulary"

/**
 * GET /api/assignments/presets/[id]/sessions
 *
 * Student Data rows for a saved roster's students, in one request (no
 * per-student fan-out). Teacher session-visibility applies, so the
 * requesting teacher sees assignment working copies they assigned plus
 * any other sessions they are entitled to see.
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

    const [sessions, spellingReviewCounts] = await Promise.all([
      getStudentSessionsForStudentIds(preset.studentIds, {
        id: session.user.id,
        role,
      }),
      getSpellingReviewSessionCountsForUsers(preset.studentIds),
    ])

    return NextResponse.json({ sessions, spellingReviewCounts })
  } catch (error) {
    console.error("Failed to get preset student sessions:", error)
    return NextResponse.json({ error: "Failed to get student sessions" }, { status: 500 })
  }
}
