import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClient } from "@/lib/db"
import { z } from "zod"

// ── Zod schema for the combined import payload ──────────────────────────────

const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  createdAt: z.number(),
})

const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  role: z.enum(["admin", "teacher", "student"]),
  schoolId: z.string().nullable().optional(),
  createdAt: z.number().nullable().optional(),
})

const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
  schoolId: z.string().nullable().optional(),
  createdAt: z.number(),
})

const MembershipSchema = z.object({
  classId: z.string(),
  studentId: z.string(),
  joinedAt: z.number(),
})

const ImportPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  schools: z.array(SchoolSchema),
  users: z.array(UserSchema),
  classes: z.array(ClassSchema),
  classMemberships: z.array(MembershipSchema),
})

/**
 * POST /api/admin/import
 *
 * Admin-only endpoint. Accepts the JSON produced by GET /api/admin/export
 * and restores all three user-management tables using upsert semantics so
 * the operation is safely re-runnable (idempotent).
 *
 * What is restored / merged:
 *  - schools       → upsert on id (name + domain updated if changed)
 *  - users         → upsert on id using exported name/email/image so users can
 *                    sign in immediately on a fresh server. The @auth/pg-adapter
 *                    matches by email on first OAuth sign-in and links the
 *                    account to the pre-populated row. "emailVerified" is left
 *                    NULL and will be set by the auth provider on sign-in.
 *  - user_roles    → upsert role on user_id
 *  - classes       → upsert on id (name, description, teacher_id, school_id)
 *  - class_members → upsert on student_id (one class per student constraint)
 *
 * The response includes counts of what was upserted.
 */
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = ImportPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import file format", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { schools, users, classes, classMemberships } = parsed.data

  const client = await getClient()
  try {
    await client.query("BEGIN")

    // ── 1. Schools ─────────────────────────────────────────────────────────
    let schoolsUpserted = 0
    for (const school of schools) {
      const ts = new Date(school.createdAt).toISOString()
      await client.query(
        `INSERT INTO schools (id, name, domain, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
           SET name       = EXCLUDED.name,
               domain     = EXCLUDED.domain`,
        [school.id, school.name, school.domain, ts]
      )
      schoolsUpserted++
    }

    // ── 2. Users — upsert user rows, then apply school_id + role ──────────
    // We pre-populate missing user rows using the exported name/email/image so
    // that users can sign in immediately on a fresh server without a cold-start
    // first sign-in. The @auth/pg-adapter matches by email on first OAuth
    // sign-in, finds the pre-populated row, and links the account to it.
    // "emailVerified" is intentionally left NULL; the auth provider will set it.
    let usersUpserted = 0
    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, name, email, image, "emailVerified")
         VALUES ($1, $2, $3, $4, NULL)
         ON CONFLICT (id) DO UPDATE
           SET name  = EXCLUDED.name,
               email = EXCLUDED.email,
               image = EXCLUDED.image`,
        [user.id, user.name ?? null, user.email ?? null, user.image ?? null]
      )
      // Update school assignment
      await client.query(
        `UPDATE users SET school_id = $1 WHERE id = $2`,
        [user.schoolId ?? null, user.id]
      )
      // Upsert role
      await client.query(
        `INSERT INTO user_roles (user_id, role)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`,
        [user.id, user.role]
      )
      usersUpserted++
    }

    // Build the set of user IDs for membership filtering (all users now exist)
    const existingUserIds = new Set<string>(users.map((u) => u.id))

    // ── 3. Classes ─────────────────────────────────────────────────────────
    let classesUpserted = 0
    for (const cls of classes) {
      const ts = new Date(cls.createdAt).toISOString()
      await client.query(
        `INSERT INTO classes (id, name, description, teacher_id, school_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
           SET name        = EXCLUDED.name,
               description = EXCLUDED.description,
               teacher_id  = EXCLUDED.teacher_id,
               school_id   = EXCLUDED.school_id`,
        [
          cls.id,
          cls.name,
          cls.description ?? null,
          cls.teacherId ?? null,
          cls.schoolId ?? null,
          ts,
        ]
      )
      classesUpserted++
    }

    // ── 4. Class Memberships ───────────────────────────────────────────────
    // Only insert memberships where both the class and the student exist
    // locally (skips orphaned references from the export).
    const classIds = new Set(classes.map((c) => c.id))

    let membershipsUpserted = 0
    let membershipsSkipped = 0
    for (const m of classMemberships) {
      if (!classIds.has(m.classId) || !existingUserIds.has(m.studentId)) {
        membershipsSkipped++
        continue
      }
      const ts = new Date(m.joinedAt).toISOString()
      await client.query(
        `INSERT INTO class_members (class_id, student_id, joined_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id) DO UPDATE
           SET class_id  = EXCLUDED.class_id,
               joined_at = EXCLUDED.joined_at`,
        [m.classId, m.studentId, ts]
      )
      membershipsUpserted++
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      summary: {
        schoolsUpserted,
        usersUpserted,
        classesUpserted,
        membershipsUpserted,
        membershipsSkipped,
      },
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Import failed:", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
