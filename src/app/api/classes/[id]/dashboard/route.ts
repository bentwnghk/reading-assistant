import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherDashboardData, getTeacherDashboardDataForSchool, getTeacherDashboardDataAllSchools, canAccessClass, getSchoolForUser } from "@/lib/users"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get("schoolId")

  try {
    if (id === "all") {
      if (role === "super-admin") {
        if (schoolId && schoolId !== "all") {
          const data = await getTeacherDashboardDataForSchool(schoolId)
          return NextResponse.json(data)
        }
        const data = await getTeacherDashboardDataAllSchools()
        return NextResponse.json(data)
      }
      const userSchoolId = await getSchoolForUser(session.user.id)
      if (!userSchoolId) {
        return NextResponse.json({ error: "No school assigned" }, { status: 400 })
      }
      const data = await getTeacherDashboardDataForSchool(userSchoolId)
      return NextResponse.json(data)
    }

    if (!await canAccessClass(session.user.id, role, id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await getTeacherDashboardData(id)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to get teacher dashboard data:", error)
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 })
  }
}
