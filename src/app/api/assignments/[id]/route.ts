import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"
import {
  getAssignment,
  updateAssignment,
  deleteAssignment,
} from "@/lib/assignments"

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  subject: z.string().max(100).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const assignment = await getAssignment(id, session.user.id, session.user.role)
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }
    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Only the owner teacher can update (admins/super-admins can edit user roles,
    // but assignments are pedagogical content owned by the teacher)
    const existing = await getAssignment(id, session.user.id, session.user.role)
    if (!existing) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }
    if (existing.teacherId !== session.user.id && session.user.role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const success = await updateAssignment(id, existing.teacherId, parsed.data)
    if (!success) {
      return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await getAssignment(id, session.user.id, session.user.role)
    if (!existing) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }
    if (existing.teacherId !== session.user.id && session.user.role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const success = await deleteAssignment(id, existing.teacherId)
    if (!success) {
      return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
  }
}
