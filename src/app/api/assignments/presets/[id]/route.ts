import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"
import { updatePreset, deletePreset } from "@/lib/assignment-presets"

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  studentIds: z.array(z.string().min(1)).min(1).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "admin" && role !== "super-admin") {
      return NextResponse.json(
        { error: "Only admins can modify presets" },
        { status: 403 },
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const preset = await updatePreset(id, session.user.id, role, parsed.data)
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }
    return NextResponse.json(preset)
  } catch (error) {
    console.error("Error updating assignment preset:", error)
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "A preset with that name already exists"
        : "Failed to update preset"
    return NextResponse.json({ error: message }, { status: 500 })
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

    const role = session.user.role
    if (role !== "admin" && role !== "super-admin") {
      return NextResponse.json(
        { error: "Only admins can modify presets" },
        { status: 403 },
      )
    }

    const { id } = await params
    const success = await deletePreset(id, session.user.id, role)
    if (!success) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting assignment preset:", error)
    return NextResponse.json(
      { error: "Failed to delete preset" },
      { status: 500 },
    )
  }
}
