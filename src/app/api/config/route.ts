import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    fallbackModel: process.env.FALLBACK_MODEL || "gemini-3.8-flash",
    idleTimeoutMinutes: parseInt(
      process.env.SESSION_IDLE_TIMEOUT_MINUTES || "30",
      10
    ),
    // Realtime (Socket.io) server URL for multiplayer spelling battles.
    // Server-side runtime variable (NOT NEXT_PUBLIC_*) so the same Docker image
    // can be deployed across environments without rebuilding. Empty string
    // disables the multiplayer option in the UI.
    realtimeUrl: process.env.REALTIME_URL || "",
    // Whether the PWA install prompt dialog is shown (default: true).
    // Server-side runtime variable exposed via /api/config so deployments can
    // toggle it without rebuilding the Docker image.
    pwaInstallPromptEnabled: process.env.PWA_INSTALL_PROMPT_ENABLED !== "false",
  });
}
