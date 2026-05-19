import { auth } from "@/auth";
import {
  acceptReviewListShare,
  rejectReviewListShare,
} from "@/lib/review-lists";
import { NextResponse } from "next/server";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (parsed.data.action === "accept") {
      const words = await acceptReviewListShare(id, session.user.id);
      if (!words) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ words });
    }

    const success = await rejectReviewListShare(id, session.user.id);
    if (!success) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling review list share:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
