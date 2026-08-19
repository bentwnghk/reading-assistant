import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserVocabulary, getVocabularyStats, getVocabularyDueForReview } from "@/lib/vocabulary";
import { canViewStudentVocabulary } from "@/lib/users";

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
