import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertVocabularyFromGlossary } from "@/lib/vocabulary";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { glossary, ratings, sessionId } = body as {
      glossary: GlossaryEntry[];
      ratings: Record<string, GlossaryRating>;
      sessionId: string;
    };

    if (!Array.isArray(glossary) || !sessionId) {
      return NextResponse.json(
        { error: "glossary and sessionId are required" },
        { status: 400 }
      );
    }

    await upsertVocabularyFromGlossary(
      session.user.id,
      glossary,
      ratings || {},
      sessionId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync vocabulary:", error);
    return NextResponse.json(
      { error: "Failed to sync vocabulary" },
      { status: 500 }
    );
  }
}
