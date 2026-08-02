import { auth } from "@/auth";
import {
  createReviewList,
  getReviewLists,
  deleteReviewList,
  updateReviewList,
} from "@/lib/review-lists";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  words: z
    .array(
      z.object({
        word: z.string().min(1),
        syllabification: z.string().optional().default(""),
        partOfSpeech: z.string().optional().default(""),
        englishDefinition: z.string().optional().default(""),
        chineseDefinition: z.string().optional().default(""),
        example: z.string().optional().default(""),
        entryType: z.enum(["word", "phrase"]).optional(),
      })
    )
    .min(1),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const lists = await getReviewLists(session.user.id);
    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching review lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch review lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const list = await createReviewList(
      session.user.id,
      parsed.data.name,
      parsed.data.words
    );
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Error creating review list:", error);
    return NextResponse.json(
      { error: "Failed to create review list" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const schema = z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(200),
      words: z
        .array(
          z.object({
            word: z.string().min(1),
            syllabification: z.string().optional().default(""),
            partOfSpeech: z.string().optional().default(""),
            englishDefinition: z.string().optional().default(""),
            chineseDefinition: z.string().optional().default(""),
            example: z.string().optional().default(""),
            entryType: z.enum(["word", "phrase"]).optional(),
          })
        )
        .min(1),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateReviewList(
      session.user.id,
      parsed.data.id,
      parsed.data.name,
      parsed.data.words
    );
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating review list:", error);
    return NextResponse.json(
      { error: "Failed to update review list" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const deleted = await deleteReviewList(session.user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review list:", error);
    return NextResponse.json(
      { error: "Failed to delete review list" },
      { status: 500 }
    );
  }
}
