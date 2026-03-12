import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllClasses, createClass, getClassesForTeacher, getSchoolForUser } from "@/lib/users"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    let classes
    if (session.user.role === "admin") {
      classes = await getAllClasses()
    } else {
      // Teachers see all classes in their school
      classes = await getClassesForTeacher(session.user.id)
    }
    return NextResponse.json(classes)
  } catch (error) {
    console.error("Failed to get classes:", error)
    return NextResponse.json({ error: "Failed to get classes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Both admins and teachers can create classes
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, teacherId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 })
    }

    // Determine which school this class belongs to:
    // - Admin: may pass an explicit schoolId in the body, or it derives from the teacherId's school
    // - Teacher: always uses their own school
    let schoolId: string | undefined
    if (session.user.role === "admin") {
      if (body.schoolId) {
        schoolId = body.schoolId
      } else if (teacherId) {
        const teacherSchool = await getSchoolForUser(teacherId)
        schoolId = teacherSchool ?? undefined
      }
    } else {
      // Teacher: use their own school
      const teacherSchool = await getSchoolForUser(session.user.id)
      schoolId = teacherSchool ?? undefined
    }

    const classInfo = await createClass(
      name.trim(),
      description?.trim() || "",
      teacherId === null ? undefined : (teacherId || (session.user.role === "teacher" ? session.user.id : undefined)),
      schoolId
    )

    if (!classInfo) {
      return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
    }

    return NextResponse.json(classInfo)
  } catch (error) {
    console.error("Failed to create class:", error)
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}
