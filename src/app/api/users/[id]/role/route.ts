import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { setUserRole, type UserRole } from "@/lib/users"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  const { id } = await params
  
  try {
    const body = await request.json()
    const { role } = body as { role: UserRole }
    
    if (!["admin", "teacher", "student"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    
    const success = await setUserRole(id, role)
    
    if (!success) {
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update user role:", error)
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
  }
}
