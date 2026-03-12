import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateClass, deleteClass, getAllClasses, getClassesForTeacher, canAccessClass, getSchoolForUser } from "@/lib/users"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const classes = session.user.role === "admin"
      ? await getAllClasses()
      : await getClassesForTeacher(session.user.id)

    const classInfo = classes.find(c => c.id === id)

    if (!classInfo) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    return NextResponse.json(classInfo)
  } catch (error) {
    console.error("Failed to get class:", error)
    return NextResponse.json({ error: "Failed to get class" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Both admins and teachers can update classes, but only within their school
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  // Verify the caller belongs to the same school as this class
  if (!await canAccessClass(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, teacherId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 })
    }

    // schoolId: admin may change it explicitly; teacher always stays in their own school
    let schoolId: string | undefined
    if (session.user.role === "admin") {
      if (body.schoolId) {
        schoolId = body.schoolId
      } else if (teacherId) {
        const teacherSchool = await getSchoolForUser(teacherId)
        schoolId = teacherSchool ?? undefined
      }
    } else {
      const teacherSchool = await getSchoolForUser(session.user.id)
      schoolId = teacherSchool ?? undefined
    }

    const success = await updateClass(id, name.trim(), description?.trim() || "", teacherId, schoolId)

    if (!success) {
      return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update class:", error)
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only admins can delete classes
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const success = await deleteClass(id)

    if (!success) {
      return NextResponse.json({ error: "Failed to delete class" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete class:", error)
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 })
  }
}
