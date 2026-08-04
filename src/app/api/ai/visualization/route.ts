import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVisualizationPrompt } from "@/constants/readingPrompts";
import { multiApiKeyPolling } from "@/utils/model";
import { getPool } from "@/lib/db";
import { verifySubscriptionAccess } from "@/lib/subscription";
import { verifySignature, parseAccessPasswords } from "@/utils/signature";

const ZENMUX_API_KEY = process.env.ZENMUX_API_KEY || "";
const ACCESS_PASSWORDS = parseAccessPasswords(process.env.ACCESS_PASSWORD || "");

const DAILY_LIMIT_SUBSCRIPTION = parseInt(
  process.env.VISUALIZATION_DAILY_LIMIT_SUBSCRIPTION || "2",
  10
);
const DAILY_LIMIT_FREE = parseInt(
  process.env.VISUALIZATION_DAILY_LIMIT_FREE || "1",
  10
);
const ZENMUX_API_BASE_URL =
  process.env.ZENMUX_API_BASE_URL || "https://zenmux.ai/api/vertex-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const GOOGLE_API_BASE_URL =
  process.env.GOOGLE_GENERATIVE_AI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com";

const OPENAI_COMPATIBLE_API_BASE_URL =
  process.env.OPENAI_COMPATIBLE_API_BASE_URL || "";
const OPENAI_COMPATIBLE_API_KEY =
  process.env.OPENAI_COMPATIBLE_API_KEY || "";
const OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY =
  process.env.OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || "";

const IMAGE_MODEL =
  process.env.IMAGE_MODEL || "google/gemini-3.1-flash-image-preview";

function extractBase64FromGeminiResponse(data: any): string | null {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType || "image/png";
      return `data:${mime};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

function formatModelResource(model: string): string {
  if (model.startsWith("publishers/")) return model;
  if (model.includes("/")) {
    const idx = model.indexOf("/");
    return `publishers/${model.substring(0, idx)}/models/${model.substring(idx + 1)}`;
  }
  return `publishers/google/models/${model}`;
}

async function callZenMuxApi(
  prompt: string,
  model: string
): Promise<Response> {
  const modelResource = formatModelResource(model);
  const url = `${ZENMUX_API_BASE_URL}/v1/${modelResource}:generateContent`;
  const apiKey = multiApiKeyPolling(ZENMUX_API_KEY);

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });
}

async function callGoogleNativeApi(
  prompt: string,
  model: string
): Promise<Response> {
  const url = `${GOOGLE_API_BASE_URL}/v1beta/models/${model}:generateContent`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });
}

async function callOpenAICompatibleApi(
  prompt: string,
  model: string,
  isSubscriptionMode: boolean
): Promise<Response> {
  const apiKey = multiApiKeyPolling(
    isSubscriptionMode
      ? (OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || OPENAI_COMPATIBLE_API_KEY)
      : OPENAI_COMPATIBLE_API_KEY
  );

  return fetch(
    `${OPENAI_COMPATIBLE_API_BASE_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        responseModalities: ["TEXT", "IMAGE"],
        responseFormat: {
          image: {
            aspectRatio: "16:9",
            imageSize: "1K",
          },
        },
      }),
    }
  );
}

function extractFromOpenAIResponse(data: any): string | null {
  const message = data?.choices?.[0]?.message;
  if (!message) return null;

  if (typeof message.content === "string") {
    const b64Match = message.content.match(
      /data:(image\/[a-zA-Z+]+);base64,([A-Za-z0-9+/=\s]+)/
    );
    if (b64Match) {
      const mime = b64Match[1];
      const b64 = b64Match[2].replace(/\s/g, "");
      return `data:${mime};base64,${b64}`;
    }
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === "image_url" && part.image_url?.url) {
        return part.image_url.url;
      }
      if (part.type === "image" && part.source?.data) {
        const mime = part.source.media_type || "image/png";
        return `data:${mime};base64,${part.source.data}`;
      }
      if (part.type === "image" && part.image_url?.url) {
        return part.image_url.url;
      }
      if (part.inline_data?.data) {
        const mime = part.inline_data.mime_type || "image/png";
        return `data:${mime};base64,${part.inline_data.data}`;
      }
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
  }

  return null;
}

const ADMIN_ROLES = new Set(["admin", "super-admin"]);

function forbiddenResponse() {
  return NextResponse.json(
    { error: { code: 403, message: "No permissions", status: "FORBIDDEN" } },
    { status: 403 }
  );
}

async function verifyModeAccess(
  userId: string,
  mode: string | undefined,
  signature: string | undefined
): Promise<boolean> {
  if (mode === "subscription") {
    try {
      return await verifySubscriptionAccess(userId);
    } catch {
      return false;
    }
  }
  if (mode === "proxy") {
    if (!signature || ACCESS_PASSWORDS.length === 0) return false;
    return verifySignature(signature, ACCESS_PASSWORDS, Date.now());
  }
  if (mode === "local") {
    return true;
  }
  return false;
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
    const hasAccess = await verifyModeAccess(session.user.id, mode, signature);
    if (!hasAccess) {
      return forbiddenResponse();
    }
    const isMeterMode = mode === "local";
    const info = await getDailyLimitInfo(session.user.id, session.user.role, isMeterMode);
    return NextResponse.json(info);
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
    const { text, studentAge, useChinese } = body as {
      text: string;
      studentAge: number;
      useChinese?: boolean;
      mode?: string;
    };

    const signature = request.headers.get("x-access-signature") || undefined;
    const hasAccess = await verifyModeAccess(session.user.id, body.mode, signature);
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

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 }
      );
    }

    const age = typeof studentAge === "number" ? studentAge : 13;
    const prompt = generateVisualizationPrompt(age, text, !!useChinese);

    const errors: string[] = [];
    let imageDataUrl: string | null = null;

    if (ZENMUX_API_KEY) {
      try {
        const response = await callZenMuxApi(prompt, IMAGE_MODEL);
        if (response.ok) {
          const data = await response.json();
          imageDataUrl = extractBase64FromGeminiResponse(data);
        } else {
          const errorText = await response.text();
          errors.push(`ZenMux (${response.status}): ${errorText.substring(0, 200)}`);
        }
      } catch (e) {
        errors.push(`ZenMux: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!imageDataUrl && GOOGLE_API_KEY) {
      try {
        const response = await callGoogleNativeApi(prompt, IMAGE_MODEL);
        if (response.ok) {
          const data = await response.json();
          imageDataUrl = extractBase64FromGeminiResponse(data);
        } else {
          const errorText = await response.text();
          errors.push(`Google AI (${response.status}): ${errorText.substring(0, 200)}`);
        }
      } catch (e) {
        errors.push(`Google AI: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!imageDataUrl && OPENAI_COMPATIBLE_API_KEY && OPENAI_COMPATIBLE_API_BASE_URL) {
      try {
        const response = await callOpenAICompatibleApi(prompt, IMAGE_MODEL, body.mode === "subscription");
        if (response.ok) {
          const data = await response.json();
          imageDataUrl =
            extractFromOpenAIResponse(data) ?? extractBase64FromGeminiResponse(data);
          if (!imageDataUrl) {
            errors.push(
              `OpenAI-compatible (200): response did not contain a recognizable image. keys=${Object.keys(data ?? {}).join(",")}`
            );
          }
        } else {
          const errorText = await response.text();
          errors.push(`OpenAI-compatible (${response.status}): ${errorText.substring(0, 200)}`);
        }
      } catch (e) {
        errors.push(`OpenAI-compatible: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

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
