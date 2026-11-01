import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import { getEssay, updateEssay, deleteEssay } from "@/lib/language-check"
import { patchSchema } from "@/lib/language-check-schema"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const essay = await getEssay(session.user.id, id)
    if (!essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json(essay)
  } catch (error) {
    console.error("Error fetching language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const ok = await updateEssay(session.user.id, id, parsed.data)
    if (!ok) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const ok = await deleteEssay(session.user.id, id)
    if (!ok) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
