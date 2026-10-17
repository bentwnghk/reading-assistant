import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import {
  LearnValidationError,
  deleteSession,
  getSession,
  syncSession,
} from "@/lib/language-check-learn"
import { patchBodySchema } from "@/lib/language-check-learn-schema"
import { invalid, requireUser } from "@/lib/language-check-learn-http"

type Ctx = { params: Promise<{ id: string }> }

const NOT_FOUND = { error: "Learning session not found" }

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const { id } = await context.params
    const detail = await getSession(user.userId, id)
    return detail ? NextResponse.json(detail) : NextResponse.json(NOT_FOUND, { status: 404 })
  } catch (error) {
    console.error("Error fetching language-check learn session:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

/** Saves a delta (content, answers, position, behavioural events); returns the merged state. */
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const { id } = await context.params
    const parsed = patchBodySchema.safeParse(await request.json())
    if (!parsed.success) return invalid(parsed.error)
    const result = await syncSession(user.userId, id, parsed.data)
    return result ? NextResponse.json(result) : NextResponse.json(NOT_FOUND, { status: 404 })
  } catch (error) {
    if (error instanceof LearnValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error saving language-check learn session:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const { id } = await context.params
    const ok = await deleteSession(user.userId, id)
    return ok ? NextResponse.json({ success: true }) : NextResponse.json(NOT_FOUND, { status: 404 })
  } catch (error) {
    console.error("Error deleting language-check learn session:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
