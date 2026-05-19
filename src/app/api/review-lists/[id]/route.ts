import { auth } from "@/auth";
import { getReviewList } from "@/lib/review-lists";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const list = await getReviewList(session.user.id, id);
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
