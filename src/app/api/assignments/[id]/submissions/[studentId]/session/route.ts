import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStudentSessionForTeacher } from "@/lib/assignments"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "teacher" && role !== "admin" && role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, studentId } = await params
    const result = await getStudentSessionForTeacher(id, studentId, session.user.id, role)
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching student session for teacher:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
