import { auth } from "@/auth"
import { getSchoolSubscriptionEvents } from "@/lib/school-subscription"
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
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) {
    return NextResponse.json({ error: "Missing schoolId" }, { status: 400 })
  }

  // School admins may only view events for their own school.
  if (role === "admin") {
    const adminSchoolId = await getSchoolForUser(session.user.id)
    if (!adminSchoolId || adminSchoolId !== schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const events = await getSchoolSubscriptionEvents(schoolId)
  return NextResponse.json({ events })
}
