import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordSRSAction, updateVocabularyReview, insertVocabularyWordOnReview, getVocabularyWordMastery } from "@/lib/vocabulary";
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
      const updated = await updateVocabularyReview(session.user.id, word, correct, newMastery, calculatedNext);
      if (!updated) {
        // The word was never synced into user_vocabulary (failed glossary
        // sync, or the review raced the first sync). Create it carrying this
        // review's outcome; if a concurrent PATCH (the rating branch
        // auto-inserts too) won the insert race, apply the UPDATE to the
        // now-existing row instead.
        const inserted = await insertVocabularyWordOnReview(
          session.user.id,
          word,
          correct,
          newMastery,
          calculatedNext,
          wordData ?? undefined
        );
        if (!inserted) {
          await updateVocabularyReview(session.user.id, word, correct, newMastery, calculatedNext);
        }
      }
      // Surface the SRS outcome so callers (spelling games' result screens)
      // can show the "leveled up / next review" reward framing.
      return NextResponse.json({ success: true, newMastery, nextReviewAt: calculatedNext });
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
