import { auth } from "@/auth"
import { getFeaturePopularity } from "@/lib/feature-popularity"
import { getSchoolForUser } from "@/lib/users"
import { NextResponse } from "next/server"
import { z } from "zod"

const QuerySchema = z.object({
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  startDate: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    const isSuperAdmin = role === "super-admin"
    const isAdmin = role === "admin"

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = QuerySchema.parse({
      schoolId: searchParams.get("schoolId") || undefined,
      classId: searchParams.get("classId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
    })

    let effectiveSchoolId = query.schoolId
    if (isAdmin) {
      // Admins are always scoped to their own school.
      effectiveSchoolId = (await getSchoolForUser(session.user.id)) ?? undefined
    }

    let startDate: Date | undefined
    if (query.startDate) {
      const parsed = new Date(query.startDate)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid startDate" }, { status: 400 })
      }
      startDate = parsed
    }

    const features = await getFeaturePopularity({
      schoolId: effectiveSchoolId,
      classId: query.classId,
      startDate,
    })

    return NextResponse.json({ features })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.flatten() },
        { status: 400 }
      )
    }
    console.error("[feature-popularity] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch feature popularity" },
      { status: 500 }
    )
  }
}
