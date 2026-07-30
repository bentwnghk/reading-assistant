import { auth } from "@/auth"
import { getSubscriptionEvents } from "@/lib/subscription"
import { getSchoolForUser } from "@/lib/users"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  // School admins may only view events for users in their own school.
  if (role === "admin") {
    const adminSchoolId = await getSchoolForUser(session.user.id)
    const targetSchoolId = await getSchoolForUser(userId)
    if (!adminSchoolId || adminSchoolId !== targetSchoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const events = await getSubscriptionEvents(userId)
  return NextResponse.json({ events })
}
