import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { assignUserSchool } from "@/lib/users"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    // schoolId may be null to un-assign
    const { schoolId } = body as { schoolId: string | null }

    const success = await assignUserSchool(id, schoolId ?? null)

    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to assign user school:", error)
    return NextResponse.json({ error: "Failed to assign school" }, { status: 500 })
  }
}
