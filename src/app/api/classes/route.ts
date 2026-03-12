import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllClasses, createClass, getClassesForTeacher } from "@/lib/users"

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  try {
    let classes
    if (session.user.role === "admin") {
      classes = await getAllClasses()
    } else {
      classes = await getClassesForTeacher(session.user.id)
    }
    return NextResponse.json(classes)
  } catch (error) {
    console.error("Failed to get classes:", error)
    return NextResponse.json({ error: "Failed to get classes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  try {
    const body = await request.json()
    const { name, description, teacherId } = body
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 })
    }
    
    const classInfo = await createClass(name.trim(), description?.trim() || "", teacherId)
    
    if (!classInfo) {
      return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
    }
    
    return NextResponse.json(classInfo)
  } catch (error) {
    console.error("Failed to create class:", error)
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}
