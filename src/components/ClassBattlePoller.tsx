"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

/**
 * Mounted in the root layout. Polls the realtime server every 60s for
 * class-battle invites and shows a toast if any are found.
 *
 * This catches students who are NOT currently connected to the WebSocket (and
 * thus would miss the socket-level `class_battle_available` event) — for
 * example, students browsing the dashboard, leaderboard, or reading page.
 */
let cachedRealtimeUrl: string | null = null;

async function fetchRealtimeUrl(): Promise<string | null> {
  if (cachedRealtimeUrl) return cachedRealtimeUrl;
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return null;
    const data = (await res.json()) as { realtimeUrl?: string };
    cachedRealtimeUrl = data.realtimeUrl ?? null;
    return cachedRealtimeUrl;
  } catch {
    return null;
  }
}

async function fetchTicket(): Promise<string | null> {
  try {
    const res = await fetch("/api/realtime/ticket", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ticket: string };
    return data.ticket;
  } catch {
    return null;
  }
}

export function ClassBattlePoller() {
  const { data: session } = useSession();
  const shownInvitesRef = useRef<Set<string>>(new Set()); // avoid duplicate toasts

  useEffect(() => {
    if (session?.user?.role !== "student") return;

    const poll = async () => {
      try {
        const baseUrl = await fetchRealtimeUrl();
        if (!baseUrl) return;
        const ticket = await fetchTicket();
        if (!ticket) return;

        const res = await fetch(
          `${baseUrl}/api/battle/pending-class-invites?ticket=${encodeURIComponent(ticket)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const body = (await res.json()) as {
          invites: { roomCode: string; hostName: string | null; actualWordCount: number }[];
        };
        for (const invite of body.invites) {
          if (shownInvitesRef.current.has(invite.roomCode)) continue;
          shownInvitesRef.current.add(invite.roomCode);
          toast(
            `${invite.hostName ?? "A teacher"} started a spelling battle (${invite.actualWordCount} words)! Open Spelling Challenge → Multiplayer Battle → enter code: ${invite.roomCode}`,
            { duration: 15_000 },
          );
        }
      } catch {
        // silent — polling must never break core UX
      }
    };

    // Poll immediately on mount, then every 60s.
    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.role]);

  return null; // invisible — side effect only
}
