import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllSchools } from "@/lib/users"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const schools = await getAllSchools()
    return NextResponse.json(schools)
  } catch (error) {
    console.error("Failed to get schools:", error)
    return NextResponse.json({ error: "Failed to get schools" }, { status: 500 })
  }
}
