import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { revokeSchoolAccessBulk } from "@/lib/users"
import { notifySubscriptionEvent } from "@/lib/subscription-email"
import { z } from "zod"

const BodySchema = z.object({
  userIds: z.array(z.string()).min(1).max(500),
  graceDays: z.number().int().min(0).max(30).default(2),
})

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: z.infer<typeof BodySchema>
  try {
    const raw = await request.json()
    body = BodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { success, failed } = await revokeSchoolAccessBulk(body.userIds, body.graceDays)

  const accessEndDate = new Date(Date.now() + body.graceDays * 24 * 60 * 60 * 1000).toLocaleDateString()

  for (const userId of success) {
    try {
      await notifySubscriptionEvent(userId, "school_access_revoked", {
        accessEndDate,
      })
    } catch {
      // email send failure should not block the revoke operation
    }
  }

  return NextResponse.json({ success, failed })
}
