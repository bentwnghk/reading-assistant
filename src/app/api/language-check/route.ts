import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import { LANGUAGE_CHECK_MAX_ESSAYS } from "@/constants/languageCheck"
import { listEssays, createEssay, countEssays } from "@/lib/language-check"
import { createSchema } from "@/lib/language-check-schema"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(await listEssays(session.user.id))
  } catch (error) {
    console.error("Error listing language-check essays:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    if ((await countEssays(session.user.id)) >= LANGUAGE_CHECK_MAX_ESSAYS) {
      return NextResponse.json(
        { error: "Essay limit reached. Delete an old essay first." },
        { status: 409 },
      )
    }

    const essay = await createEssay(session.user.id, parsed.data)
    return NextResponse.json(essay, { status: 201 })
  } catch (error) {
    console.error("Error creating language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
