import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordSRSAction, updateVocabularyReview, getVocabularyWordMastery } from "@/lib/vocabulary";
import { calculateNextReview } from "@/utils/srs";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { word, srsAction, wordData, correct, masteryLevel, nextReviewAt } = body as {
      word: string;
      srsAction?: SRSAction;
      wordData?: {
        syllabification: string;
        partOfSpeech: string;
        englishDefinition: string;
        chineseDefinition: string;
        example: string;
        source: VocabularySource;
        sharedBy: string | null;
      };
      correct?: boolean;
      masteryLevel?: VocabularyMasteryLevel;
      nextReviewAt?: number;
    };

    if (!word) {
      return NextResponse.json({ error: "word is required" }, { status: 400 });
    }

    if (srsAction) {
      const result = await recordSRSAction(session.user.id, word, srsAction, wordData ?? undefined);
      return NextResponse.json({ success: true, rating: result.rating, srsCounts: result.srsCounts, id: result.id, source: result.source });
    }

    if (typeof correct === "boolean" && typeof masteryLevel === "number" && typeof nextReviewAt === "number") {
      await updateVocabularyReview(session.user.id, word, correct, masteryLevel, nextReviewAt);
      return NextResponse.json({ success: true });
    }

    if (typeof correct === "boolean") {
      const existing = await getVocabularyWordMastery(session.user.id, word);
      const currentLevel = existing?.masteryLevel ?? 0;
      const { newMastery, nextReviewAt: calculatedNext } = calculateNextReview(
        currentLevel as 0 | 1 | 2 | 3 | 4 | 5,
        correct
      );
      await updateVocabularyReview(session.user.id, word, correct, newMastery, calculatedNext);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update vocabulary word:", error);
    return NextResponse.json(
      { error: "Failed to update vocabulary word" },
      { status: 500 }
    );
  }
}
