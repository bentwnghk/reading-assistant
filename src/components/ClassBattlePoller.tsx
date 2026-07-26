"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useBattleStore } from "@/store/battle";

const M = "reading.glossary.spelling.multiplayer";

/**
 * Mounted in the root layout. Polls the realtime server every 60s for
 * class-battle invites so students see them anywhere in the app — not just
 * when the multiplayer lobby is open.
 *
 * Two outputs:
 *   1. A persistent toast per invite (stays until the student joins OR the
 *      room is destroyed/started — not a fixed timer).
 *   2. Populates `pendingClassBattleInvites` in the battle store → drives the
 *      red badge count on the header bell (alongside pending shares).
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
  const { t } = useTranslation();
  /** roomCodes that currently have an active persistent toast. */
  const activeToastsRef = useRef<Set<string>>(new Set());

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
          invites: { roomCode: string; hostName: string | null; className: string | null; actualWordCount: number; difficulty: string }[];
        };

        // Map to the store payload shape.
        const storeInvites: BattleClassBattleAvailablePayload[] = body.invites.map((i) => ({
          roomCode: i.roomCode,
          hostName: i.hostName,
          className: i.className ?? null,
          actualWordCount: i.actualWordCount,
          difficulty: i.difficulty as SpellingDifficulty,
        }));
        useBattleStore.getState().setPendingClassBattleInvites(storeInvites);

        const currentCodes = new Set(storeInvites.map((i) => i.roomCode));
        const joinedRoom = useBattleStore.getState().roomCode;

        // Dismiss toasts for invites that vanished (room destroyed / battle
        // started) or for the room the student just joined.
        for (const code of activeToastsRef.current) {
          if (!currentCodes.has(code) || code === joinedRoom) {
            toast.dismiss(code);
            activeToastsRef.current.delete(code);
          }
        }

        // Show a persistent toast for new invites (not yet shown, not joined).
        for (const invite of storeInvites) {
          if (activeToastsRef.current.has(invite.roomCode)) continue;
          if (invite.roomCode === joinedRoom) continue;
          activeToastsRef.current.add(invite.roomCode);
          toast(
            t(`${M}.classBattleToast`, {
              hostName: invite.hostName ?? t(`${M}.aTeacher`),
              wordCount: invite.actualWordCount,
              roomCode: invite.roomCode,
            }),
            { id: invite.roomCode, duration: Infinity },
          );
        }
      } catch {
        // silent — polling must never break core UX
      }
    };

    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.role]);

  // Dismiss the toast immediately when the student joins a room (don't wait
  // for the next 60s poll).
  useEffect(() => {
    const unsubscribe = useBattleStore.subscribe((state) => {
      if (state.roomCode && activeToastsRef.current.has(state.roomCode)) {
        toast.dismiss(state.roomCode);
        activeToastsRef.current.delete(state.roomCode);
      }
    });
    return unsubscribe;
  }, []);

  return null;
}
