import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { getSchoolForUser } from "@/lib/users"
import { updateSubject, deleteSubject } from "@/lib/class-taxonomy"

const updateSchema = z.object({
  name: z.string().min(1).max(100),
  schoolId: z.string().min(1).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const schoolId = role === "super-admin"
      ? parsed.data.schoolId
      : (await getSchoolForUser(session.user.id)) ?? undefined
    if (!schoolId) {
      return NextResponse.json({ error: "School is required" }, { status: 400 })
    }

    const success = await updateSubject(id, schoolId, parsed.data.name.trim())
    if (!success) {
      return NextResponse.json({ error: "Failed to update subject" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update subject:", error)
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const schoolId = role === "super-admin"
      ? new URL(request.url).searchParams.get("schoolId") ?? undefined
      : (await getSchoolForUser(session.user.id)) ?? undefined
    if (!schoolId) {
      return NextResponse.json({ error: "School is required" }, { status: 400 })
    }

    const success = await deleteSubject(id, schoolId)
    if (!success) {
      return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete subject:", error)
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 })
  }
}
