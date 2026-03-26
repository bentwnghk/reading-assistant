import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createClass, getClassesForTeacher, getClassesForSchool, getSchoolForUser, getAllClasses } from "@/lib/users"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
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
    } else if (role === "admin") {
      const adminSchool = await getSchoolForUser(session.user.id)
      schoolId = adminSchool ?? undefined
    } else {
      const teacherSchool = await getSchoolForUser(session.user.id)
      schoolId = teacherSchool ?? undefined
    }

    const classInfo = await createClass(
      name.trim(),
      description?.trim() || "",
      teacherId === null ? undefined : (teacherId || (role === "teacher" ? session.user.id : undefined)),
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
