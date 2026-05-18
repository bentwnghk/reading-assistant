import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserVocabulary, getVocabularyStats, getVocabularyDueForReview } from "@/lib/vocabulary";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "stats") {
      const stats = await getVocabularyStats(session.user.id);
      return NextResponse.json(stats);
    }

    if (type === "due") {
      const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 200);
      const words = await getVocabularyDueForReview(session.user.id, limit);
      return NextResponse.json(words);
    }

    const words = await getUserVocabulary(session.user.id);
    const stats = await getVocabularyStats(session.user.id);
    return NextResponse.json({ words, stats });
  } catch (error) {
    console.error("Failed to fetch vocabulary:", error);
    return NextResponse.json(
      { error: "Failed to fetch vocabulary" },
      { status: 500 }
    );
  }
}
