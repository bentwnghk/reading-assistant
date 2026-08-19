import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createReviewSession,
  getReviewSessions,
  getReviewSessionDetail,
  deleteReviewSession,
} from "@/lib/vocabulary";
import { canViewStudentVocabulary } from "@/lib/users";
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
      attempts: z.number().int().min(1).optional(),
    })
  ),
  ratingCounts: z.object({
    again: z.number().int().min(0),
    hard: z.number().int().min(0),
    good: z.number().int().min(0),
    easy: z.number().int().min(0),
  }).optional(),
  entryType: z.enum(["word", "phrase"]).optional(),
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
      parsed.data.results,
      parsed.data.ratingCounts,
      parsed.data.entryType
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
    const entryTypeParam = searchParams.get("entryType");
    const entryType =
      entryTypeParam === "word" || entryTypeParam === "phrase"
        ? entryTypeParam
        : undefined;

    // Teacher/admin/super-admin may read another (permitted) student's
    // sessions (read-only: POST/DELETE below stay self-scoped)
    const userIdParam = searchParams.get("userId");
    let targetUserId = session.user.id;
    if (userIdParam && userIdParam !== session.user.id) {
      const role = session.user.role;
      if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const allowed = await canViewStudentVocabulary(session.user.id, role, userIdParam);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      targetUserId = userIdParam;
    }

    if (sessionId) {
      const detail = await getReviewSessionDetail(targetUserId, sessionId);
      if (!detail) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(detail);
    }

    const sessions = await getReviewSessions(targetUserId, limit, entryType);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch review sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch review sessions" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const deleted = await deleteReviewSession(session.user.id, sessionId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete review session:", error);
    return NextResponse.json(
      { error: "Failed to delete review session" },
      { status: 500 }
    );
  }
}
