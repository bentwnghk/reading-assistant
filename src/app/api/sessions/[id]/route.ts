import { auth } from "@/auth"
import { 
  getReadingSession, 
  updateReadingSession, 
  deleteReadingSession 
} from "@/lib/sessions"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionData = await getReadingSession(session.user.id, params.id)
    
    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    
    return NextResponse.json(sessionData)
  } catch (error) {
    console.error("Error fetching session:", error)
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionData = await request.json()
    const success = await updateReadingSession(
      session.user.id,
      params.id,
      sessionData
    )
    
    if (!success) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating session:", error)
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const success = await deleteReadingSession(session.user.id, params.id)
    
    if (!success) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting session:", error)
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    )
  }
}
