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
    const text = await getRepositoryText(id, session.user.role, schoolId)

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
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, isPublic, title } = body

    const updated = await updateRepositoryText(id, session.user.id, session.user.role, {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      ...(title !== undefined && { title: String(title) }),
    })

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
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
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const deleted = await deleteRepositoryText(id, session.user.id, session.user.role)

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
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
