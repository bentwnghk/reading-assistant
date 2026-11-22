import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVisualizationPrompt, translateVisualizationPrompt } from "@/constants/readingPrompts";
import { getPool } from "@/lib/db";
import {
  generateImageWithProviders,
  parseDataUrl,
  resolveImageModel,
  verifyModeAccess,
} from "@/lib/image-generation";
import { verifySubscriptionAccess } from "@/lib/subscription";

const DAILY_LIMIT_SUBSCRIPTION = parseInt(
  process.env.VISUALIZATION_DAILY_LIMIT_SUBSCRIPTION || "2",
  10
);
const DAILY_LIMIT_FREE = parseInt(
  process.env.VISUALIZATION_DAILY_LIMIT_FREE || "1",
  10
);
const ADMIN_ROLES = new Set(["admin", "super-admin"]);

function forbiddenResponse() {
  return NextResponse.json(
    { error: { code: 403, message: "No permissions", status: "FORBIDDEN" } },
    { status: 403 }
  );
}

async function getDailyLimitInfo(
  userId: string,
  role?: string,
  isMeterMode?: boolean
): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  if (role && ADMIN_ROLES.has(role)) {
    return { limit: Infinity, used: 0, remaining: Infinity };
  }

  if (isMeterMode) {
    return { limit: Infinity, used: 0, remaining: Infinity };
  }

  const isSubscriber = await verifySubscriptionAccess(userId);
  const limit = isSubscriber ? DAILY_LIMIT_SUBSCRIPTION : DAILY_LIMIT_FREE;

  const pool = getPool();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM activity_logs
     WHERE user_id = $1
       AND activity_type = 'visualization_generate'
       AND created_at >= $2`,
    [userId, todayStart.toISOString()]
  );

  const used = result.rows[0]?.cnt ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || undefined;
    const signature = request.headers.get("x-access-signature") || undefined;
    const hasAccess = await verifyModeAccess(
      session.user.id,
      session.user.email,
      mode,
      signature
    );
    const isMeterMode = mode === "local";
    const info = await getDailyLimitInfo(session.user.id, session.user.role, isMeterMode);
    // The quota check is informational (drives the "X remaining" UI), so
    // users without AI access yet get hasAccess:false instead of a 403 —
    // a fresh sign-up would otherwise log a console error on every mount.
    // The POST route still enforces access strictly.
    return NextResponse.json({ ...info, hasAccess });
  } catch (error) {
    console.error("Visualization limit check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, studentAge, useChinese, image, imageModel } = body as {
      text: string;
      studentAge: number;
      useChinese?: boolean;
      mode?: string;
      image?: string;
      imageModel?: string;
    };

    // User-selected visualization model (Settings → Models); validated
    // against the allowlist (admins/super-admins and meter-billing users may
    // additionally pick the premium model), falling back to the server
    // default.
    const model = resolveImageModel(imageModel, session.user.role, body.mode);

    const signature = request.headers.get("x-access-signature") || undefined;
    const hasAccess = await verifyModeAccess(
      session.user.id,
      session.user.email,
      body.mode,
      signature
    );
    if (!hasAccess) {
      return forbiddenResponse();
    }

    const isMeterMode = body.mode === "local";
    const limitInfo = await getDailyLimitInfo(session.user.id, session.user.role, isMeterMode);
    if (limitInfo.remaining <= 0) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          limit: limitInfo.limit,
          used: limitInfo.used,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // Translation path: when an existing visualization image is supplied,
    // "Regenerate" becomes an image-to-image edit that only translates the
    // text in the image (same composition) instead of re-analyzing the text.
    const inputImage = image && typeof image === "string" ? parseDataUrl(image) : null;
    const isTranslation = !!inputImage;

    if ((!text || typeof text !== "string") && !isTranslation) {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 }
      );
    }

    const age = typeof studentAge === "number" ? studentAge : 13;
    const prompt = isTranslation
      ? translateVisualizationPrompt(!!useChinese)
      : generateVisualizationPrompt(age, text, !!useChinese);

    const { image: imageDataUrl, errors } = await generateImageWithProviders(
      prompt,
      model,
      body.mode,
      isTranslation ? image : null
    );

    if (!imageDataUrl) {
      console.error("All visualization providers failed:", errors);
      return NextResponse.json(
        {
          error: "Image generation failed",
          details: errors.join("; "),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      image: imageDataUrl,
      remaining: Math.max(0, limitInfo.remaining - 1),
    });
  } catch (error) {
    console.error("Visualization API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
