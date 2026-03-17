import { auth } from "@/auth"
import { logChatQuestion, getAggregatedQuestions } from "@/lib/chatQuestions"
import { NextResponse } from "next/server"
import { z } from "zod"

const LogQuestionSchema = z.object({
  questionText: z.string().min(1).max(10000),
  responseText: z.string().max(50000),
  sessionId: z.string().optional(),
  docTitle: z.string().max(500).optional(),
})

const QuerySchema = z.object({
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = LogQuestionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { questionText, responseText, sessionId, docTitle } = parsed.data

    await logChatQuestion(session.user.id, questionText, responseText, {
      sessionId,
      docTitle,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("[chat-questions] POST error:", error)
    return NextResponse.json(
      { error: "Failed to log question" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const query = QuerySchema.parse({
      schoolId: searchParams.get("schoolId") || undefined,
      classId: searchParams.get("classId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    })

    const startDate = query.startDate ? new Date(query.startDate) : undefined
    const endDate = query.endDate ? new Date(query.endDate) : undefined

    const result = await getAggregatedQuestions({
      schoolId: query.schoolId,
      classId: query.classId,
      startDate,
      endDate,
      limit: query.limit,
      offset: query.offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[chat-questions] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    )
  }
}
