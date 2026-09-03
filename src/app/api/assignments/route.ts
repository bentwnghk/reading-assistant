import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"
import {
  createAssignment,
  getAssignmentsForTeacher,
  getAssignmentsForStudent,
  getSchoolAssignments,
  getAllAssignments,
  resolveAssignableStudentIds,
} from "@/lib/assignments"
import { getReadingSession } from "@/lib/sessions"
import { getSchoolForUser } from "@/lib/users"
import { getPresetById } from "@/lib/assignment-presets"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  subject: z.string().max(100).optional().default(""),
  dueDate: z.string().datetime().nullable().optional(),
  sourceSessionId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1),
  /** The saved preset applied in the dialog, if any. Its members become
   *  assignable even when not in the teacher's own classes. */
  presetId: z.string().min(1).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role

    // School-wide oversight view: every assignment by any teacher in the
    // admin's school (all schools for super-admin).
    const scope = new URL(request.url).searchParams.get("scope")
    if (scope === "school") {
      if (role === "super-admin") {
        return NextResponse.json(await getAllAssignments())
      }
      if (role === "admin") {
        const schoolId = await getSchoolForUser(session.user.id)
        return NextResponse.json(
          schoolId ? await getSchoolAssignments(schoolId) : [],
        )
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (role === "teacher" || role === "admin" || role === "super-admin") {
      const assignments = await getAssignmentsForTeacher(session.user.id)
      return NextResponse.json(assignments)
    }
    if (role === "student") {
      const assignments = await getAssignmentsForStudent(session.user.id)
      return NextResponse.json(assignments)
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "teacher" && role !== "admin" && role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { sourceSessionId, studentIds, dueDate, presetId, ...rest } = parsed.data

    // Fetch the source session — must belong to the requesting teacher
    const sourceSession = await getReadingSession(session.user.id, sourceSessionId)
    if (!sourceSession) {
      return NextResponse.json({ error: "Source session not found" }, { status: 404 })
    }
    if (!sourceSession.extractedText) {
      return NextResponse.json(
        { error: "Source session has no extracted text to assign" },
        { status: 400 },
      )
    }

    // Validate the applied preset (if any): must exist and belong to the
    // requester's school (any school for super-admin).
    let presetStudentIds: string[] | undefined
    if (presetId) {
      const preset = await getPresetById(presetId)
      if (!preset) {
        return NextResponse.json({ error: "Preset not found" }, { status: 404 })
      }
      if (role !== "super-admin") {
        const requesterSchoolId = await getSchoolForUser(session.user.id)
        if (preset.schoolId !== requesterSchoolId) {
          return NextResponse.json(
            { error: "Preset not available in your school" },
            { status: 403 },
          )
        }
      }
      presetStudentIds = preset.studentIds
    }

    // Resolve valid student ids based on requester role
    const candidateIds = await resolveAssignableStudentIds(session.user.id, role, presetStudentIds)
    const validIds = new Set(candidateIds)
    const filteredStudentIds = studentIds.filter((id) => validIds.has(id) && id !== session.user.id)

    if (filteredStudentIds.length === 0) {
      return NextResponse.json(
        { error: "No valid students selected" },
        { status: 400 },
      )
    }

    const assignment = await createAssignment({
      teacherId: session.user.id,
      sourceSessionId,
      sourceSessionData: sourceSession,
      studentIds: filteredStudentIds,
      dueDate: dueDate ?? null,
      ...rest,
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}
