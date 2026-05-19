import { auth } from "@/auth";
import { getPendingReviewListShares, getPendingReviewListShareCount } from "@/lib/review-lists";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("count") === "1";

    if (countOnly) {
      const count = await getPendingReviewListShareCount(session.user.id);
      return NextResponse.json({ count });
    }

    const shares = await getPendingReviewListShares(session.user.id);
    return NextResponse.json(shares);
  } catch (error) {
    console.error("Error fetching pending review list shares:", error);
    return NextResponse.json(
      { error: "Failed to fetch shares" },
      { status: 500 }
    );
  }
}
