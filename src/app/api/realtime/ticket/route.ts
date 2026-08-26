import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getSchoolForUser, isUserBanned } from "@/lib/users";
import { getPool } from "@/lib/db";
import { issueRealtimeTicket } from "@/lib/realtime-ticket";

/**
 * Issues a short-lived HMAC-signed ticket that authenticates a Socket.io
 * connection to the realtime server. The client fetches this immediately before
 * connecting and re-fetches on each reconnect (handled by realtime-client.ts).
 *
 * The ticket encodes the authenticated user's identity + role + schoolId +
 * classId (for students, to enable class-battle invite routing) and expires
 * in 30s.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Banned users cannot obtain realtime tickets (blocks spelling battles).
    if (await isUserBanned(session.user.id, session.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schoolId = await getSchoolForUser(session.user.id);

    // Resolve class memberships for students (used for class-battle invite
    // targeting). Signs both the legacy single classId (first membership) and
    // the full classIds array — the realtime server accepts either.
    let classId: string | null = null;
    let classIds: string[] = [];
    if (session.user.role === "student") {
      try {
        const pool = getPool();
        const result = await pool.query<{ class_id: string }>(
          `SELECT class_id FROM class_members WHERE student_id = $1 ORDER BY joined_at, class_id`,
          [session.user.id],
        );
        classIds = result.rows.map((row) => row.class_id);
        classId = classIds.length > 0 ? classIds[0] : null;
      } catch {
        // best-effort — class battles gracefully degrade
      }
    }

    const ticket = issueRealtimeTicket({
      userId: session.user.id,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: session.user.role,
      schoolId,
      classId,
      classIds,
    });
    return NextResponse.json({ ticket, expiresInMs: 30_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
