import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseError } from "@/utils/error";
import {
  getDailyWordDays,
  isDayInRange,
  markDailyWordLearned,
  pinDailyWord,
  setDailyWordNote,
  userHasWord,
} from "@/lib/daily-word";
import { dailyWordActionSchema } from "@/lib/daily-word-schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const days = await getDailyWordDays(session.user.id);
    return NextResponse.json({ days });
  } catch (error) {
    console.error("Daily word GET error:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = dailyWordActionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    if (!isDayInRange(body.dayKey)) {
      return NextResponse.json({ error: "Day out of range" }, { status: 400 });
    }
    // Only words the user actually owns can be a word of the day.
    if (!(await userHasWord(userId, body.word))) {
      return NextResponse.json({ error: "Unknown word" }, { status: 404 });
    }

    if (body.action === "pin") {
      const day = await pinDailyWord(userId, body.dayKey, body.word);
      return NextResponse.json({ day });
    }
    if (body.action === "learn") {
      const day = await markDailyWordLearned(
        userId,
        body.dayKey,
        body.word,
        body.onTime
      );
      return NextResponse.json({ day });
    }
    await setDailyWordNote(userId, body.dayKey, body.word, body.note);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Daily word POST error:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
