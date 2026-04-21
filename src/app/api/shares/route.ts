import { auth } from "@/auth"
import { getPendingShares, createSharedSessions } from "@/lib/shared-sessions"
import { getReadingSession } from "@/lib/sessions"
import { NextResponse } from "next/server"
import { z } from "zod"

const shareSchema = z.object({
  sessionId: z.string().min(1),
  recipientIds: z.array(z.string().min(1)).min(1),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pending = await getPendingShares(session.user.id)
    return NextResponse.json(pending)
  } catch (error) {
    console.error("Error fetching shared sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch shared sessions" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = shareSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { sessionId, recipientIds } = parsed.data

    const existingSession = await getReadingSession(session.user.id, sessionId)
    if (!existingSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    const inserted = await createSharedSessions(
      session.user.id,
      recipientIds,
      sessionId,
      existingSession
    )

    return NextResponse.json({ inserted }, { status: 201 })
  } catch (error) {
    console.error("Error creating shared sessions:", error)
    return NextResponse.json(
      { error: "Failed to share session" },
      { status: 500 }
    )
  }
}
