import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { getSchoolForUser } from "@/lib/users"
import { getAllSubjects, getSubjectsForSchool, createSubject } from "@/lib/class-taxonomy"

const createSchema = z.object({
  name: z.string().min(1).max(100),
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
      return NextResponse.json(await getAllSubjects())
    }
    const schoolId = await getSchoolForUser(session.user.id)
    return NextResponse.json(schoolId ? await getSubjectsForSchool(schoolId) : [])
  } catch (error) {
    console.error("Failed to get subjects:", error)
    return NextResponse.json({ error: "Failed to get subjects" }, { status: 500 })
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

    const subject = await createSubject(schoolId, parsed.data.name.trim())
    if (!subject) {
      return NextResponse.json({ error: "Failed to create subject" }, { status: 500 })
    }
    return NextResponse.json(subject)
  } catch (error) {
    console.error("Failed to create subject:", error)
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 })
  }
}
