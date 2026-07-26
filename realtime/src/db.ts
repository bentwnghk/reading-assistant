/**
 * Lazy Postgres connection pool. Only created on first use (Phase 4 word-list
 * fetching). Not connected at boot so the server can start without a DB.
 *
 * Mirrors the singleton pattern in the app's `src/lib/db.ts`.
 */
import { Pool } from "pg";

import { config } from "./config";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error("[realtime] DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2_000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Best-effort lookup of the class a student belongs to (one class per student
 * per the class_members PK). Returns null for non-students, students without a
 * class, or if the DB is unreachable — class battles degrade gracefully.
 */
export async function resolveClassId(userId: string): Promise<string | null> {
  try {
    const p = getPool();
    const result = await p.query<{ class_id: string }>(
      `SELECT class_id FROM class_members WHERE student_id = $1`,
      [userId],
    );
    return result.rows.length > 0 ? result.rows[0].class_id : null;
  } catch {
    return null;
  }
}

/**
 * Verify a teacher/admin owns or may target a class (RBAC for class battles).
 * Teachers: must own the class. Admins/super-admins: any class in their school.
 */
export async function canTargetClass(
  userId: string,
  role: string,
  schoolId: string | null,
  classId: string,
): Promise<boolean> {
  try {
    const p = getPool();
    if (role === "teacher") {
      const result = await p.query(`SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2`, [classId, userId]);
      return result.rows.length > 0;
    }
    if (role === "admin" || role === "super-admin") {
      if (role === "super-admin") return true;
      const result = await p.query(`SELECT 1 FROM classes WHERE id = $1 AND school_id = $2`, [classId, schoolId]);
      return result.rows.length > 0;
    }
    return false;
  } catch {
    return false;
  }
}

/** Fetch a class name + the owner's name for the class-battle notification. */
export async function getClassInfo(
  classId: string,
): Promise<{ className: string | null; ownerName: string | null }> {
  try {
    const p = getPool();
    const result = await p.query<{ name: string | null; owner_name: string | null }>(
      `SELECT c.name, u.name AS owner_name FROM classes c LEFT JOIN users u ON u.id = c.teacher_id WHERE c.id = $1`,
      [classId],
    );
    if (result.rows.length === 0) return { className: null, ownerName: null };
    return { className: result.rows[0].name, ownerName: result.rows[0].owner_name };
  } catch {
    return { className: null, ownerName: null };
  }
}
