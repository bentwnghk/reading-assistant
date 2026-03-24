import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { addStudentToClass, removeStudentFromClass } from "@/lib/users"

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
    const { classId } = body as { classId: string | null }

    let success: boolean
    if (classId) {
      success = await addStudentToClass(classId, id)
    } else {
      success = await removeStudentFromClass(id)
    }

    if (!success) {
      return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to assign user class:", error)
    return NextResponse.json({ error: "Failed to assign class" }, { status: 500 })
  }
}
