import { auth } from "@/auth"
import { getQuestionInstances } from "@/lib/chatQuestions"
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

    const isAdmin = session.user.role === "admin"
    const isTeacher = session.user.role === "teacher"

    if (!isAdmin && !isTeacher) {
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

    const instances = await getQuestionInstances(hash, {
      schoolId: query.schoolId,
      classId: query.classId,
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
