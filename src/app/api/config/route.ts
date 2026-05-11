import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    fallbackModel: process.env.FALLBACK_MODEL || "gemini-3-flash-preview",
  });
}
