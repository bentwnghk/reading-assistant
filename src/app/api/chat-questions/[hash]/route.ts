import { auth } from "@/auth"
import { getQuestionInstances } from "@/lib/chatQuestions"
import { getClassesForTeacher, getSchoolForUser } from "@/lib/users"
import { NextResponse } from "next/server"
import { z } from "zod"

const QuerySchema = z.object({
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    const isSuperAdmin = role === "super-admin"
    const isAdmin = role === "admin"
    const isTeacher = role === "teacher"

    if (!isSuperAdmin && !isAdmin && !isTeacher) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { hash } = await params

    if (!hash || hash.length > 32) {
      return NextResponse.json({ error: "Invalid hash" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const query = QuerySchema.parse({
      schoolId: searchParams.get("schoolId") || undefined,
      classId: searchParams.get("classId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    })

    const startDate = query.startDate ? new Date(query.startDate) : undefined
    const endDate = query.endDate ? new Date(query.endDate) : undefined

    let effectiveSchoolId = query.schoolId
    const classId = query.classId
    let classIds: string[] | undefined

    if (isTeacher) {
      const teacherClasses = await getClassesForTeacher(session.user.id)
      const teacherClassIds = teacherClasses.map(c => c.id)
      
      if (classId && !teacherClassIds.includes(classId)) {
        return NextResponse.json({ instances: [] })
      }
      
      if (!classId && teacherClassIds.length > 0) {
        classIds = teacherClassIds
      }
    } else if (isAdmin) {
      const adminSchoolId = await getSchoolForUser(session.user.id)
      if (adminSchoolId && !effectiveSchoolId) {
        effectiveSchoolId = adminSchoolId
      }
    }

    const instances = await getQuestionInstances(hash, {
      schoolId: effectiveSchoolId,
      classId,
      classIds,
      startDate,
      endDate,
    })

    return NextResponse.json({ instances })
  } catch (error) {
    console.error("[chat-questions/hash] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch question instances" },
      { status: 500 }
    )
  }
}
