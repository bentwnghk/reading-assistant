import { auth } from "@/auth";
import { getReviewList } from "@/lib/review-lists";
import { canViewStudentVocabulary } from "@/lib/users";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Teacher/admin/super-admin may read another (permitted) user's list
    // (read-only: there are no write methods on this route)
    const { searchParams } = new URL(request.url);
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

    const { id } = await params;
    const list = await getReviewList(targetUserId, id);
    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching review list:", error);
    return NextResponse.json(
      { error: "Failed to fetch review list" },
      { status: 500 }
    );
  }
}
