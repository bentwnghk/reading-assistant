import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import {
  addStudentToClass,
  removeStudentFromClass,
  removeStudentFromAllClasses,
  getStudentClassIds,
  getClassSchoolId,
  getSchoolForUser,
  canManageUser,
} from "@/lib/users"

const bodySchema = z.union([
  z.object({ classIds: z.array(z.string().min(1)) }),
  z.object({ classId: z.string().min(1).nullable() }),
])

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (role === "admin") {
    const canManage = await canManageUser(session.user.id, role, id)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden - can only manage users in your school" }, { status: 403 })
    }
  }

  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    if ("classIds" in parsed.data) {
      // Full-set sync: add missing memberships, remove unlisted ones.
      const targetIds = [...new Set(parsed.data.classIds)]

      const studentSchoolId = await getSchoolForUser(id)
      for (const classId of targetIds) {
        const classSchoolId = await getClassSchoolId(classId)
        if (classSchoolId && classSchoolId !== studentSchoolId) {
          return NextResponse.json(
            { error: "Class does not belong to the same school as this student" },
            { status: 403 }
          )
        }
      }

      const currentIds = new Set(await getStudentClassIds(id))
      for (const classId of targetIds) {
        if (!currentIds.has(classId)) {
          const success = await addStudentToClass(classId, id)
          if (!success) {
            return NextResponse.json({ error: "Failed to update classes" }, { status: 500 })
          }
        }
      }
      for (const classId of currentIds) {
        if (!targetIds.includes(classId)) {
          const success = await removeStudentFromClass(classId, id)
          if (!success) {
            return NextResponse.json({ error: "Failed to update classes" }, { status: 500 })
          }
        }
      }

      return NextResponse.json({ success: true })
    }

    // Legacy single-class payload: add one class, or remove all memberships.
    const { classId } = parsed.data
    const success = classId
      ? await addStudentToClass(classId, id)
      : await removeStudentFromAllClasses(id)

    if (!success) {
      return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to assign user classes:", error)
    return NextResponse.json({ error: "Failed to assign classes" }, { status: 500 })
  }
}
