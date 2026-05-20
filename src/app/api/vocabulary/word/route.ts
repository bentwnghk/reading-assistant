import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordSRSAction, updateVocabularyReview } from "@/lib/vocabulary";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { word, srsAction, correct, masteryLevel, nextReviewAt } = body as {
      word: string;
      srsAction?: SRSAction;
      correct?: boolean;
      masteryLevel?: VocabularyMasteryLevel;
      nextReviewAt?: number;
    };

    if (!word) {
      return NextResponse.json({ error: "word is required" }, { status: 400 });
    }

    if (srsAction) {
      const result = await recordSRSAction(session.user.id, word, srsAction);
      return NextResponse.json({ success: true, rating: result.rating, srsCounts: result.srsCounts });
    }

    if (typeof correct === "boolean" && typeof masteryLevel === "number" && typeof nextReviewAt === "number") {
      await updateVocabularyReview(session.user.id, word, correct, masteryLevel, nextReviewAt);
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
