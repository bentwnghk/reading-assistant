import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseError } from "@/utils/error";
import {
  countDailyWordImagesToday,
  getDailyWordContent,
  getDailyWordImage,
  saveDailyWordImage,
  type DailyWordImageKind,
} from "@/lib/daily-word";
import {
  dailyWordContentSchema,
  dailyWordImagePostSchema,
} from "@/lib/daily-word-schema";
import {
  generateImageWithProviders,
  resolveImageModel,
  verifyModeAccess,
} from "@/lib/image-generation";
import { dailyWordImagePrompt } from "@/constants/readingPrompts";

const DAILY_LIMIT = parseInt(process.env.DAILY_WORD_IMAGE_DAILY_LIMIT || "12", 10);
const ADMIN_ROLES = new Set(["admin", "super-admin"]);
const MAX_SIDE = 768;

// Concurrent opens (two tabs/devices) share one provider call.
const inflight = new Map<string, Promise<string>>();

/** Shrinks to a small WebP so each illustration stays well under ~100 KB. */
async function compress(dataUrl: string): Promise<string> {
  try {
    const m = /^data:image\/[a-zA-Z+]+;base64,(.+)$/.exec(dataUrl);
    if (!m) return dataUrl;
    const { default: sharp } = await import("sharp");
    const out = await sharp(Buffer.from(m[1], "base64"))
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return `data:image/webp;base64,${out.toString("base64")}`;
  } catch {
    return dataUrl;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = dailyWordImagePostSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { word, kind, mode, imageModel } = parsed.data;

  try {
    // Already generated (maybe on another device): serve it, no quota used.
    const existing = await getDailyWordImage(userId, word, kind);
    if (existing) return NextResponse.json({ image: existing });

    const hasAccess = await verifyModeAccess(
      userId,
      session.user.email,
      mode,
      request.headers.get("x-access-signature") || undefined
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: { code: 403, message: "No permissions", status: "FORBIDDEN" } },
        { status: 403 }
      );
    }

    const unlimited = ADMIN_ROLES.has(session.user.role || "") || mode === "local";
    if (!unlimited && (await countDailyWordImagesToday(userId)) >= DAILY_LIMIT) {
      return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });
    }

    // Prompts come from the stored page, never from the client.
    const stored = await getDailyWordContent(userId, word);
    const content = dailyWordContentSchema.safeParse(stored.content);
    if (!content.success) {
      return NextResponse.json({ error: "Page content not found" }, { status: 409 });
    }
    const prompt = dailyWordImagePrompt(kind as DailyWordImageKind, word, content.data);
    const model = resolveImageModel(imageModel, session.user.role, mode);

    const key = `${userId}:${word.toLowerCase()}:${kind}`;
    let pending = inflight.get(key);
    if (!pending) {
      pending = (async () => {
        const result = await generateImageWithProviders(prompt, model, mode);
        if (!result.image) {
          console.error("Daily word image providers failed:", result.errors);
          throw new Error("Image generation failed");
        }
        return saveDailyWordImage(userId, word, kind, await compress(result.image));
      })().finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    return NextResponse.json({ image: await pending });
  } catch (error) {
    console.error("Daily word image error:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 502 });
  }
}
