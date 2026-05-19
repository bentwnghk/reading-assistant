import { auth } from "@/auth";
import { shareVocabularyWords } from "@/lib/vocabulary";
import { getShareTargets } from "@/lib/shared-sessions";
import { NextResponse } from "next/server";
import { z } from "zod";

const shareSchema = z.object({
  wordIds: z.array(z.string().min(1)).min(1),
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

    const { wordIds, recipientIds } = parsed.data;

    const targets = await getShareTargets(
      session.user.id,
      role as "super-admin" | "admin" | "teacher"
    );
    const allowedIds = new Set(
      targets.flatMap((g) => g.users.map((u) => u.id))
    );
    const validRecipients = recipientIds.filter((id) => allowedIds.has(id));

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients" },
        { status: 400 }
      );
    }

    const result = await shareVocabularyWords(
      session.user.id,
      validRecipients,
      wordIds
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error sharing vocabulary:", error);
    return NextResponse.json(
      { error: "Failed to share vocabulary" },
      { status: 500 }
    );
  }
}
