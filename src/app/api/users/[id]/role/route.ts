import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { setUserRole, canManageUser, type UserRole } from "@/lib/users"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  const { id } = await params
  
  if (role === "admin") {
    const canManage = await canManageUser(session.user.id, role, id)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden - can only manage users in your school" }, { status: 403 })
    }
  }
  
  try {
    const body = await request.json()
    const { role: newRole } = body as { role: UserRole }
    
    const validRoles = role === "super-admin" 
      ? ["super-admin", "admin", "teacher", "student"]
      : ["teacher", "student"]
    
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    
    const success = await setUserRole(id, newRole)
    
    if (!success) {
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update user role:", error)
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
  }
}
