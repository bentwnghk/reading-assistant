import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  canAssignTopicClass,
  deleteTopic,
  getTopic,
  updateTopic,
} from "@/lib/language-check-topics"
import { topicSchema } from "@/lib/language-check-schema"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    // Readable by the creator and by anyone who can see the topic's class
    // (members / teacher / school staff) — they may select it for upload.
    const topic = await getTopic(
      { id: session.user.id, role: session.user.role ?? "student" },
      id,
    )
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
    // A changed class target must stay within the viewer's own classes.
    if (
      parsed.data.classId &&
      !(await canAssignTopicClass(
        { id: session.user.id, role: session.user.role ?? "student" },
        parsed.data.classId,
      ))
    ) {
      return NextResponse.json(
        { error: "You can only create topics for your own classes." },
        { status: 403 },
      )
    }
    const { id } = await context.params
    // updateTopic is scoped to the creator; a topic that exists but belongs
    // to someone else is a plain 404 (no existence leak).
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
