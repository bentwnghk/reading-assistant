import { getPool, getClient } from "./db";

interface ProfileEntry {
  earned: number;
  total: number;
  correct: number;
  count: number;
  sessions: number;
}

type Profile = Record<string, ProfileEntry>;

/**
 * Recomputes the user's cross-session skill profile from ALL their sessions'
 * `skill_breakdown` snapshots. Idempotent — safe to call on every test
 * completion (no double-counting). Optionally seeds the just-finished
 * session's breakdown first so the result reflects it even if autosave hasn't
 * flushed the row yet.
 */
export async function recomputeSkillProfile(
  userId: string,
  seedSessionId?: string,
  seedBreakdown?: SkillBreakdown,
): Promise<void> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    // Ensure the just-finished session's breakdown is persisted before we
    // aggregate, so the profile always reflects the latest test.
    if (seedSessionId && seedBreakdown) {
      await client.query(
        "UPDATE reading_sessions SET skill_breakdown = $2 WHERE id = $1",
        [seedSessionId, JSON.stringify(seedBreakdown)],
      );
    }

    const result = await client.query(
      `SELECT skill_breakdown FROM reading_sessions
       WHERE user_id = $1 AND skill_breakdown IS NOT NULL`,
      [userId],
    );

    const profile: Profile = {};
    for (const skill of ["main-idea", "detail", "inference", "vocabulary", "purpose"]) {
      profile[skill] = { earned: 0, total: 0, correct: 0, count: 0, sessions: 0 };
    }

    for (const row of result.rows) {
      const breakdown = row.skill_breakdown as Record<string, SkillStat> | null;
      if (!breakdown || typeof breakdown !== "object") continue;
      let touched = false;
      for (const [skill, stat] of Object.entries(breakdown)) {
        const p = profile[skill];
        if (!p || !stat) continue;
        p.earned += Number(stat.earned) || 0;
        p.total += Number(stat.total) || 0;
        p.correct += Number(stat.correct) || 0;
        p.count += Number(stat.count) || 0;
        touched = true;
      }
      if (touched) {
        // Count one session per row that had a breakdown — distribute across
        // skills present for a rough "sessions" exposure count.
        for (const skill of Object.keys(breakdown)) {
          if (profile[skill]) profile[skill].sessions += 1;
        }
      }
    }

    let weakest: string | null = null;
    let weakestAcc = Infinity;
    for (const [skill, s] of Object.entries(profile)) {
      if (s.total > 0) {
        const acc = s.earned / s.total;
        if (acc < weakestAcc) {
          weakestAcc = acc;
          weakest = skill;
        }
      }
    }

    await client.query(
      `INSERT INTO user_skill_profile (user_id, profile, weakest_skill, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         profile = EXCLUDED.profile,
         weakest_skill = EXCLUDED.weakest_skill,
         updated_at = EXCLUDED.updated_at`,
      [userId, JSON.stringify(profile), weakest, Date.now()],
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export interface SkillProfileResponse {
  profile: Profile;
  weakestSkill: string | null;
  updatedAt: number;
}

export async function getSkillProfile(userId: string): Promise<SkillProfileResponse> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT profile, weakest_skill, updated_at FROM user_skill_profile WHERE user_id = $1",
    [userId],
  );
  const row = result.rows[0];
  if (!row) {
    return {
      profile: {},
      weakestSkill: null,
      updatedAt: 0,
    };
  }
  return {
    profile: (row.profile ?? {}) as Profile,
    weakestSkill: (row.weakest_skill as string | null) ?? null,
    updatedAt: Number(row.updated_at) || 0,
  };
}

export interface ClassSkillAverage {
  userId: string;
  userName: string | null;
  profile: Profile;
  weakestSkill: string | null;
}

/**
 * Fetches each user's skill profile for an arbitrary set of user IDs.
 * Used by the teacher dashboard which already resolves the user list
 * (for a specific class, a whole school, or all schools). Returns one
 * entry per user who has a profile row; users without a profile are
 * omitted (the UI treats them as "no data").
 */
export async function getSkillAveragesForUsers(
  userIds: string[],
): Promise<ClassSkillAverage[]> {
  if (userIds.length === 0) return [];
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.user_id, u.name, p.profile, p.weakest_skill
     FROM user_skill_profile p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.user_id = ANY($1::text[])`,
    [userIds],
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    userName: row.name ?? null,
    profile: (row.profile ?? {}) as Profile,
    weakestSkill: (row.weakest_skill as string | null) ?? null,
  }));
}

/**
 * Convenience wrapper around {@link getSkillAveragesForUsers} that resolves
 * the user list from a class's membership. Prefer calling
 * `getSkillAveragesForUsers` directly when the caller already has the user
 * IDs (e.g. the teacher dashboard route) to avoid a second membership query.
 */
export async function getClassSkillAverages(classId: string): Promise<ClassSkillAverage[]> {
  const pool = getPool();
  const members = await pool.query(
    "SELECT student_id FROM class_members WHERE class_id = $1",
    [classId],
  );
  return getSkillAveragesForUsers(members.rows.map((r) => r.student_id));
}
