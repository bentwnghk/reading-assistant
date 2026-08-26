import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { getSchoolForUser } from "@/lib/users"
import { getAllGrades, getGradesForSchool, createGrade } from "@/lib/class-taxonomy"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  schoolId: z.string().min(1).optional(),
})

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
    if (role === "super-admin") {
      return NextResponse.json(await getAllGrades())
    }
    const schoolId = await getSchoolForUser(session.user.id)
    return NextResponse.json(schoolId ? await getGradesForSchool(schoolId) : [])
  } catch (error) {
    console.error("Failed to get grades:", error)
    return NextResponse.json({ error: "Failed to get grades" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    let schoolId: string | undefined
    if (role === "super-admin") {
      schoolId = parsed.data.schoolId
    } else {
      schoolId = (await getSchoolForUser(session.user.id)) ?? undefined
    }
    if (!schoolId) {
      return NextResponse.json({ error: "School is required" }, { status: 400 })
    }

    const grade = await createGrade(schoolId, parsed.data.name.trim(), parsed.data.sortOrder)
    if (!grade) {
      return NextResponse.json({ error: "Failed to create grade" }, { status: 500 })
    }
    return NextResponse.json(grade)
  } catch (error) {
    console.error("Failed to create grade:", error)
    return NextResponse.json({ error: "Failed to create grade" }, { status: 500 })
  }
}
