import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllUsers, getUsersInSchool, getSchoolForUser } from "@/lib/users"

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  try {
    let users
    
    if (role === "super-admin") {
      users = await getAllUsers()
    } else {
      const schoolId = await getSchoolForUser(session.user.id)
      if (!schoolId) {
        return NextResponse.json([])
      }
      users = await getUsersInSchool(schoolId)
    }
    
    return NextResponse.json(users)
  } catch (error) {
    console.error("Failed to get users:", error)
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 })
  }
}
