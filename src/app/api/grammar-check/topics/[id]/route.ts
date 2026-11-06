import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import { deleteTopic, getTopic, updateTopic } from "@/lib/language-check-topics"
import { topicSchema } from "@/lib/language-check-schema"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const topic = await getTopic(session.user.id, id)
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    }
    return NextResponse.json(topic)
  } catch (error) {
    console.error("Error fetching language-check topic:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const parsed = topicSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { id } = await context.params
    const topic = await updateTopic(session.user.id, id, parsed.data)
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    }
    return NextResponse.json(topic)
  } catch (error) {
    console.error("Error updating language-check topic:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    if (!(await deleteTopic(session.user.id, id))) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting language-check topic:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
