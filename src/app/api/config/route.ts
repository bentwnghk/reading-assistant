import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    fallbackModel: process.env.FALLBACK_MODEL || "gemini-3-flash-preview",
    idleTimeoutMinutes: parseInt(
      process.env.SESSION_IDLE_TIMEOUT_MINUTES || "30",
      10
    ),
  });
}
