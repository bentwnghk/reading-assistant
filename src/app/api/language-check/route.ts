import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import { LANGUAGE_CHECK_MAX_ESSAYS } from "@/constants/languageCheck"
import {
  listEssays,
  createEssay,
  countEssays,
  isStaffRole,
  resolveStaffScope,
  canUploadForStudent,
} from "@/lib/language-check"
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

    // Teacher upload: the essay belongs to the student (so it lists, opens,
    // re-checks and feeds "Learn from mistakes" exactly as if they had
    // scanned it); the staff uploader is recorded for attribution + access.
    let ownerId = session.user.id
    let uploadedBy: string | undefined
    if (parsed.data.studentId) {
      if (!isStaffRole(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const scope = await resolveStaffScope(
        session.user.role,
        session.user.id,
      )
      if (
        !scope ||
        !(await canUploadForStudent(scope, parsed.data.studentId))
      ) {
        return NextResponse.json(
          {
            error:
              "You can only check essays for students in your classes or school.",
          },
          { status: 403 },
        )
      }
      ownerId = parsed.data.studentId
      uploadedBy = session.user.id
    }

    // The cap counts against the owner (the student for teacher uploads).
    if ((await countEssays(ownerId)) >= LANGUAGE_CHECK_MAX_ESSAYS) {
      return NextResponse.json(
        { error: "Essay limit reached. Delete an old essay first." },
        { status: 409 },
      )
    }

    const essay = await createEssay({
      userId: ownerId,
      uploadedBy,
      title: parsed.data.title,
      images: parsed.data.images,
      ocrModel: parsed.data.ocrModel,
    })
    return NextResponse.json(essay, { status: 201 })
  } catch (error) {
    console.error("Error creating language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
