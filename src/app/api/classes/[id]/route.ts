import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateClass, deleteClass, getAllClasses, getClassesForSchool, getClassesForTeacher, canAccessClass, canManageClass, getSchoolForUser } from "@/lib/users"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    let classes
    if (role === "super-admin") {
      classes = await getAllClasses()
    } else if (role === "admin") {
      const schoolId = await getSchoolForUser(session.user.id)
      classes = schoolId ? await getClassesForSchool(schoolId) : []
    } else {
      classes = await getClassesForTeacher(session.user.id)
    }

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

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (!await canAccessClass(session.user.id, role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, teacherId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 })
    }

    let schoolId: string | undefined
    if (role === "super-admin") {
      if (body.schoolId) {
        schoolId = body.schoolId
      } else if (teacherId) {
        const teacherSchool = await getSchoolForUser(teacherId)
        schoolId = teacherSchool ?? undefined
      }
    } else {
      const userSchool = await getSchoolForUser(session.user.id)
      schoolId = userSchool ?? undefined
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

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (role === "admin") {
    const canManage = await canManageClass(session.user.id, role, id)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden - can only delete classes in your school" }, { status: 403 })
    }
  }

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
