import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateClass, deleteClass, getAllClasses, getClassesForTeacher } from "@/lib/users"

async function _canAccessClass(userId: string, userRole: string, classId: string): Promise<boolean> {
  if (userRole === "admin") return true
  
  if (userRole === "teacher") {
    const classes = await getClassesForTeacher(userId)
    return classes.some(c => c.id === classId)
  }
  
  return false
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  const { id } = await params
  
  try {
    const classes = session.user.role === "admin" 
      ? await getAllClasses() 
      : await getClassesForTeacher(session.user.id)
    
    const classInfo = classes.find(c => c.id === id)
    
    if (!classInfo) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }
    
    return NextResponse.json(classInfo)
  } catch (error) {
    console.error("Failed to get class:", error)
    return NextResponse.json({ error: "Failed to get class" }, { status: 500 })
  }
}

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
    const { name, description, teacherId } = body
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 })
    }
    
    const success = await updateClass(id, name.trim(), description?.trim() || "", teacherId)
    
    if (!success) {
      return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update class:", error)
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
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
    const success = await deleteClass(id)
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete class" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete class:", error)
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 })
  }
}
