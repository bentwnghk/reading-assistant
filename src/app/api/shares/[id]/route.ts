import { auth } from "@/auth"
import { acceptSharedSession, rejectSharedSession } from "@/lib/shared-sessions"
import { NextResponse } from "next/server"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["accept", "reject"]),
})

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const parsed = actionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (parsed.data.action === "accept") {
      const newSession = await acceptSharedSession(id, session.user.id)
      if (!newSession) {
        return NextResponse.json(
          { error: "Share not found or already processed" },
          { status: 404 }
        )
      }
      return NextResponse.json({ session: newSession })
    }

    const rejected = await rejectSharedSession(id, session.user.id)
    if (!rejected) {
      return NextResponse.json(
        { error: "Share not found or already processed" },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing shared session:", error)
    return NextResponse.json(
      { error: "Failed to process shared session" },
      { status: 500 }
    )
  }
}
