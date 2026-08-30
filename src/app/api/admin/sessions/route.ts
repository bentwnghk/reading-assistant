import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { expireUserSessions } from "@/lib/users"
import { parseError } from "@/utils/error"
import { z } from "zod"

const BodySchema = z.object({
  userIds: z.array(z.string()).min(1).max(500).optional(),
})

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: z.infer<typeof BodySchema>
  try {
    const raw = await request.json()
    body = BodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const deletedSessions = await expireUserSessions({
      userIds: body.userIds,
      excludeUserId: session.user.id,
    })
    return NextResponse.json({ deletedSessions })
  } catch (error) {
    return NextResponse.json(
      { error: parseError(error) || "Failed to expire sessions" },
      { status: 500 }
    )
  }
}
