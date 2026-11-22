import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseError } from "@/utils/error";
import {
  getDailyWordContent,
  saveDailyWordContent,
  userHasWord,
} from "@/lib/daily-word";
import { dailyWordContentPutSchema } from "@/lib/daily-word-schema";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const word = new URL(request.url).searchParams.get("word")?.trim();
  if (!word || word.length > 100) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getDailyWordContent(session.user.id, word));
  } catch (error) {
    console.error("Daily word content GET error:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = dailyWordContentPutSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    if (!(await userHasWord(session.user.id, parsed.data.word))) {
      return NextResponse.json({ error: "Unknown word" }, { status: 404 });
    }
    const content = await saveDailyWordContent(
      session.user.id,
      parsed.data.word,
      parsed.data.content
    );
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Daily word content PUT error:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
