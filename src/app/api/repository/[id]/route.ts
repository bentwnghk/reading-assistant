import { auth } from "@/auth"
import { NextResponse } from "next/server"
import {
  getRepositoryText,
  updateRepositoryText,
  deleteRepositoryText,
} from "@/lib/repository"
import { getSchoolForUser } from "@/lib/users"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const schoolId = await getSchoolForUser(session.user.id)
    const text = await getRepositoryText(id, session.user.role, session.user.id, schoolId)

    if (!text) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(text)
  } catch (error) {
    console.error("Error fetching repository text:", error)
    return NextResponse.json(
      { error: "Failed to fetch repository text" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const role = session.user.role
    if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, visibility, title, extractedText } = body
    const schoolId = await getSchoolForUser(session.user.id)

    const result = await updateRepositoryText(id, session.user.id, role, schoolId, {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(visibility !== undefined && { visibility }),
      ...(title !== undefined && { title: String(title) }),
      ...(extractedText !== undefined && { extractedText: String(extractedText) }),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Not found" }, { status: result.error === "Not found" ? 404 : 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating repository text:", error)
    return NextResponse.json(
      { error: "Failed to update repository text" },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const role = session.user.role
    if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const schoolId = await getSchoolForUser(session.user.id)
    const result = await deleteRepositoryText(id, session.user.id, role, schoolId)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Not found" }, { status: result.error === "Not found" ? 404 : 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting repository text:", error)
    return NextResponse.json(
      { error: "Failed to delete repository text" },
      { status: 500 }
    )
  }
}
