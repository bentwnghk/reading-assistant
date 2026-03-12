import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClassMembers, addStudentToClass, removeStudentFromClass, getClassesForTeacher } from "@/lib/users"

async function canManageClass(userId: string, userRole: string, classId: string): Promise<boolean> {
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
  
  if (!await canManageClass(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  try {
    const members = await getClassMembers(id)
    return NextResponse.json(members)
  } catch (error) {
    console.error("Failed to get class members:", error)
    return NextResponse.json({ error: "Failed to get class members" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
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
  
  if (!await canManageClass(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  try {
    const body = await request.json()
    const { studentId } = body
    
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }
    
    const success = await addStudentToClass(id, studentId)
    
    if (!success) {
      return NextResponse.json({ error: "Failed to add student to class" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to add student to class:", error)
    return NextResponse.json({ error: "Failed to add student to class" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
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
  
  if (!await canManageClass(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }
    
    const success = await removeStudentFromClass(studentId)
    
    if (!success) {
      return NextResponse.json({ error: "Failed to remove student from class" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to remove student from class:", error)
    return NextResponse.json({ error: "Failed to remove student from class" }, { status: 500 })
  }
}
