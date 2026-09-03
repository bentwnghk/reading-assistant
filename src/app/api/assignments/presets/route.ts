import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"
import {
  getPresetsForUser,
  getPresetsUsedByUser,
  createPreset,
} from "@/lib/assignment-presets"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  studentIds: z.array(z.string().min(1)).min(1),
  /** super-admin may target a specific school. */
  schoolId: z.string().min(1).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "teacher" && role !== "admin" && role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // scope=used: only presets referenced by the requester's own
    // assignments (Teacher Dashboard / Student Data dropdowns). Default:
    // every preset the requester can see (create dialog, preset management).
    const scope = new URL(request.url).searchParams.get("scope")
    if (scope === "used") {
      return NextResponse.json(await getPresetsUsedByUser(session.user.id))
    }

    const presets = await getPresetsForUser(session.user.id, role)
    return NextResponse.json(presets)
  } catch (error) {
    console.error("Error fetching assignment presets:", error)
    return NextResponse.json(
      { error: "Failed to fetch presets" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "admin" && role !== "super-admin") {
      return NextResponse.json(
        { error: "Only admins can create presets" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const preset = await createPreset({
      teacherId: session.user.id,
      role,
      name: parsed.data.name,
      description: parsed.data.description,
      studentIds: parsed.data.studentIds,
      schoolId: parsed.data.schoolId,
    })
    return NextResponse.json(preset, { status: 201 })
  } catch (error) {
    console.error("Error creating assignment preset:", error)
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "A preset with that name already exists in this school"
        : "Failed to create preset"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
