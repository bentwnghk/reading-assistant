import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllUsers } from "@/lib/users"

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  try {
    const users = await getAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error("Failed to get users:", error)
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 })
  }
}
