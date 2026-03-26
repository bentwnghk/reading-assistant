import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getRepositoryTexts, createRepositoryText } from "@/lib/repository"
import { getSchoolForUser } from "@/lib/users"

type TextVisibility = 'class' | 'school' | 'public'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schoolId = await getSchoolForUser(session.user.id)
    const texts = await getRepositoryTexts(session.user.role, session.user.id, schoolId)
    return NextResponse.json(texts)
  } catch (error) {
    console.error("Error fetching repository texts:", error)
    return NextResponse.json(
      { error: "Failed to fetch repository texts" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const role = session.user.role
    if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, title, extractedText, visibility, images } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }
    if (!extractedText || typeof extractedText !== "string") {
      return NextResponse.json({ error: "extractedText is required" }, { status: 400 })
    }

    const schoolId = await getSchoolForUser(session.user.id)
    
    let finalVisibility: TextVisibility
    if (role === "teacher") {
      finalVisibility = "class"
    } else if (role === "admin") {
      finalVisibility = (visibility as TextVisibility) || "school"
      if (finalVisibility === "public") {
        finalVisibility = "school"
      }
    } else {
      finalVisibility = (visibility as TextVisibility) || "school"
    }

    const id = await createRepositoryText(session.user.id, schoolId, {
      name: name.trim(),
      title: title ?? "",
      extractedText,
      visibility: finalVisibility,
      images: Array.isArray(images) ? images : [],
    })

    return NextResponse.json({ id, visibility: finalVisibility }, { status: 201 })
  } catch (error) {
    console.error("Error creating repository text:", error)
    return NextResponse.json(
      { error: "Failed to create repository text" },
      { status: 500 }
    )
  }
}
