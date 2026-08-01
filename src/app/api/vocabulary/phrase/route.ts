import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertPhrase } from "@/lib/vocabulary";

interface PhraseInput {
  chunk: string;
  pattern?: string;
  meaning: string;
  meaningZh: string;
  example?: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phrases, sessionId } = body as { phrases: PhraseInput[]; sessionId?: string };

    if (!Array.isArray(phrases) || phrases.length === 0) {
      return NextResponse.json({ error: "phrases array is required" }, { status: 400 });
    }

    for (const phrase of phrases) {
      if (!phrase.chunk || !phrase.meaning) continue;
      await upsertPhrase(
        session.user.id,
        {
          chunk: phrase.chunk,
          pattern: phrase.pattern,
          meaning: phrase.meaning,
          meaningZh: phrase.meaningZh,
          example: phrase.example,
        },
        sessionId,
      );
    }

    return NextResponse.json({ added: phrases.length });
  } catch (error) {
    console.error("Add phrases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
