import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { getUserRole, setUserBanned } from "@/lib/users"

const banSchema = z.object({
  banned: z.boolean(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden - super-admin only" }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot ban your own account" }, { status: 400 })
  }

  const targetRole = await getUserRole(id)
  if (targetRole === "super-admin") {
    return NextResponse.json({ error: "Cannot ban super-admin accounts" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = banSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const success = await setUserBanned(id, parsed.data.banned)
    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, banned: parsed.data.banned })
  } catch (error) {
    console.error("Failed to update ban status:", error)
    return NextResponse.json({ error: "Failed to update ban status" }, { status: 500 })
  }
}
