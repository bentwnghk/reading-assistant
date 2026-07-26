import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getSchoolForUser } from "@/lib/users";
import { issueRealtimeTicket } from "@/lib/realtime-ticket";

/**
 * Issues a short-lived HMAC-signed ticket that authenticates a Socket.io
 * connection to the realtime server. The client fetches this immediately before
 * connecting and re-fetches on each reconnect (handled by realtime-client.ts).
 *
 * The ticket encodes the authenticated user's identity + role + schoolId and
 * expires in 30s. See `src/lib/realtime-ticket.ts` and `realtime/src/auth.ts`.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schoolId = await getSchoolForUser(session.user.id);
    const ticket = issueRealtimeTicket({
      userId: session.user.id,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: session.user.role,
      schoolId,
    });
    return NextResponse.json({ ticket, expiresInMs: 30_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
