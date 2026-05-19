import { auth } from "@/auth";
import { shareReviewList } from "@/lib/review-lists";
import { NextResponse } from "next/server";
import { z } from "zod";

const shareSchema = z.object({
  listId: z.string().min(1),
  recipientIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    if (!["super-admin", "admin", "teacher"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = shareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await shareReviewList(
      session.user.id,
      parsed.data.recipientIds,
      parsed.data.listId,
      role as "super-admin" | "admin" | "teacher"
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error sharing review list:", error);
    return NextResponse.json(
      { error: "Failed to share review list" },
      { status: 500 }
    );
  }
}
