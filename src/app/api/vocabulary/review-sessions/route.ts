import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createReviewSession,
  getReviewSessions,
  getReviewSessionDetail,
} from "@/lib/vocabulary";
import { z } from "zod";

const createSchema = z.object({
  mode: z.enum(["flashcard", "quiz", "spelling"]),
  results: z.array(
    z.object({
      word: z.string().min(1),
      correct: z.boolean(),
      masteryBefore: z.number().int().min(0).max(5),
      masteryAfter: z.number().int().min(0).max(5),
      rating: z.enum(["again", "hard", "good", "easy"]).optional(),
    })
  ),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const id = await createReviewSession(
      session.user.id,
      parsed.data.mode,
      parsed.data.results
    );
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Failed to create review session:", error);
    return NextResponse.json(
      { error: "Failed to create review session" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20"), 1),
      100
    );

    if (sessionId) {
      const detail = await getReviewSessionDetail(session.user.id, sessionId);
      if (!detail) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(detail);
    }

    const sessions = await getReviewSessions(session.user.id, limit);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch review sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch review sessions" },
      { status: 500 }
    );
  }
}
