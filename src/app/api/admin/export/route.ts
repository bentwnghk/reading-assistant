import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClient } from "@/lib/db"

/**
 * GET /api/admin/export
 *
 * Admin-only endpoint that exports a complete snapshot of the three
 * user-management tables (schools, users, classes + class_members) as a
 * single JSON document suitable for backup and full database recovery.
 *
 * Export shape:
 * {
 *   version: 1,
 *   exportedAt: <ISO-8601 string>,
 *   schools: SchoolRow[],
 *   users: UserRow[],
 *   classes: ClassRow[],
 *   classMemberships: MembershipRow[],
 * }
 */
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = await getClient()
  try {
    // ── Schools ────────────────────────────────────────────────────────────
    const schoolsResult = await client.query(
      `SELECT id, name, domain, created_at FROM schools ORDER BY created_at ASC`
    )
    const schools = schoolsResult.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      domain: r.domain as string,
      createdAt: new Date(r.created_at as string).getTime(),
    }))

    // ── Users ──────────────────────────────────────────────────────────────
    // We export id, name, email, image, school_id, created_at, and the role
    // from user_roles (defaulting to 'student' when absent).
    const usersResult = await client.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.image,
         u.school_id,
         u."createdAt",
         COALESCE(ur.role, 'student') AS role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       ORDER BY u."createdAt" ASC`
    )
    const users = usersResult.rows.map((r) => ({
      id: r.id as string,
      name: (r.name as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      role: r.role as string,
      schoolId: (r.school_id as string | null) ?? null,
      createdAt: r.createdAt ? new Date(r.createdAt as string).getTime() : null,
    }))

    // ── Classes ────────────────────────────────────────────────────────────
    const classesResult = await client.query(
      `SELECT id, name, description, teacher_id, school_id, created_at
       FROM classes
       ORDER BY created_at ASC`
    )
    const classes = classesResult.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: (r.description as string | null) ?? null,
      teacherId: (r.teacher_id as string | null) ?? null,
      schoolId: (r.school_id as string | null) ?? null,
      createdAt: new Date(r.created_at as string).getTime(),
    }))

    // ── Class Memberships ──────────────────────────────────────────────────
    const membersResult = await client.query(
      `SELECT class_id, student_id, joined_at
       FROM class_members
       ORDER BY joined_at ASC`
    )
    const classMemberships = membersResult.rows.map((r) => ({
      classId: r.class_id as string,
      studentId: r.student_id as string,
      joinedAt: new Date(r.joined_at as string).getTime(),
    }))

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      schools,
      users,
      classes,
      classMemberships,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Export failed:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
