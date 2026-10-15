import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getUserVocabulary, getVocabularyStats, getVocabularyDueForReview, deleteVocabularyWords } from "@/lib/vocabulary";
import { canViewStudentVocabulary } from "@/lib/users";

const deleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(500),
});

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Soft delete only ever targets the caller's own word bank. The teacher
  // student-view is read-only by design — there is deliberately no userId
  // override here (unlike GET above).
  try {
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ids must be a non-empty array of word ids (max 500)" },
        { status: 400 }
      );
    }

    const deleted = await deleteVocabularyWords(
      session.user.id,
      parsed.data.ids
    );
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Failed to delete vocabulary words:", error);
    return NextResponse.json(
      { error: "Failed to delete vocabulary words" },
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
    const type = searchParams.get("type");

    // Teacher/admin/super-admin may read another (permitted) student's data
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

    if (type === "stats") {
      const stats = await getVocabularyStats(targetUserId);
      return NextResponse.json(stats);
    }

    if (type === "due") {
      const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 200);
      const words = await getVocabularyDueForReview(targetUserId, limit);
      return NextResponse.json(words);
    }

    const words = await getUserVocabulary(targetUserId);
    const stats = await getVocabularyStats(targetUserId);
    return NextResponse.json({ words, stats });
  } catch (error) {
    console.error("Failed to fetch vocabulary:", error);
    return NextResponse.json(
      { error: "Failed to fetch vocabulary" },
      { status: 500 }
    );
  }
}
