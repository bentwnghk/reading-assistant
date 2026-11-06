import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import { LANGUAGE_CHECK_MAX_TOPICS } from "@/constants/languageCheck"
import { countTopics, createTopic, listTopics } from "@/lib/language-check-topics"
import { topicSchema } from "@/lib/language-check-schema"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(await listTopics(session.user.id))
  } catch (error) {
    console.error("Error listing language-check topics:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    if ((await countTopics(session.user.id)) >= LANGUAGE_CHECK_MAX_TOPICS) {
      return NextResponse.json(
        { error: "Topic limit reached. Delete an old topic first." },
        { status: 409 },
      )
    }
    return NextResponse.json(await createTopic(session.user.id, parsed.data), {
      status: 201,
    })
  } catch (error) {
    console.error("Error creating language-check topic:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
