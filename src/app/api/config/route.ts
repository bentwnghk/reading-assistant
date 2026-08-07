import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    fallbackModel: process.env.FALLBACK_MODEL || "gemini-3-flash-preview",
    idleTimeoutMinutes: parseInt(
      process.env.SESSION_IDLE_TIMEOUT_MINUTES || "30",
      10
    ),
    // Realtime (Socket.io) server URL for multiplayer spelling battles.
    // Server-side runtime variable (NOT NEXT_PUBLIC_*) so the same Docker image
    // can be deployed across environments without rebuilding. Empty string
    // disables the multiplayer option in the UI.
    realtimeUrl: process.env.REALTIME_URL || "",
  });
}
