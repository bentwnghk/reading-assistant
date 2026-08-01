import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { recomputeSkillProfile, getSkillProfile } from "@/lib/skill-profile";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const profile = await getSkillProfile(session.user.id);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Skill profile GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId, breakdown } = body as {
      sessionId?: string;
      breakdown?: SkillBreakdown;
    };

    // Recompute from all sessions; seed the just-finished session's breakdown
    // so the result reflects the latest test even if autosave hasn't flushed.
    await recomputeSkillProfile(
      session.user.id,
      sessionId,
      breakdown && typeof breakdown === "object" ? breakdown : undefined,
    );

    const profile = await getSkillProfile(session.user.id);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Skill profile POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
