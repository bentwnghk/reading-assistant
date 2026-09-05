import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVisualizationPrompt, translateVisualizationPrompt } from "@/constants/readingPrompts";
import { multiApiKeyPolling } from "@/utils/model";
import { getPool } from "@/lib/db";
import { verifySubscriptionAccess } from "@/lib/subscription";
import { isFreeAccessEmail } from "@/lib/free-access";
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

/** Split a `data:image/png;base64,...` URL into the raw base64 payload and
 *  mime type expected by Gemini-style `inlineData` parts. Returns null for
 *  anything that isn't a base64 data URL. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2].replace(/\s/g, "") };
}

async function callZenMuxApi(
  prompt: string,
  model: string,
  inputImage?: { mimeType: string; data: string } | null
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
          parts: inputImage
            ? [{ inlineData: inputImage }, { text: prompt }]
            : [{ text: prompt }],
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
  model: string,
  inputImage?: { mimeType: string; data: string } | null
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
          parts: inputImage
            ? [{ inlineData: inputImage }, { text: prompt }]
            : [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });
}

/** Image-only models are served by `/v1/images/generations` (or `/edits`),
 *  not `/v1/chat/completions` — gateways route strictly by endpoint. */
function isImagesOnlyModel(model: string): boolean {
  return (
    /dall-e|gpt-image|imagine|flux|seedream|stable-?diffusion|sd3|cogview|wanx|ideogram|recraft|midjourney|mj-/i.test(
      model
    ) || /\.(png|jpg|jpeg|webp)$/i.test(model)
  );
}

/** A failed chat-completions response that means "this model belongs on the
 *  images endpoint" — triggers a retry via `/v1/images/generations`. */
function isModelNotSupportedForChat(status: number, body: string): boolean {
  if (status !== 400 && status !== 404) return false;
  return /model_not_supported|not supported by .*chat\/completions|only supports? .*images\/generations|does not support.*chat/i.test(
    body
  );
}

async function callOpenAICompatibleApi(
  prompt: string,
  model: string,
  isSubscriptionMode: boolean,
  inputImageDataUrl?: string | null
): Promise<Response> {
  const apiKey = multiApiKeyPolling(
    isSubscriptionMode
      ? (OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || OPENAI_COMPATIBLE_API_KEY)
      : OPENAI_COMPATIBLE_API_KEY
  );

  // For translation edits the existing image is passed as a multimodal
  // `image_url` data-URL part (best-effort: endpoints that support image
  // output generally accept image input in this format too).
  const content: unknown = inputImageDataUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: inputImageDataUrl } },
      ]
    : prompt;

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
        messages: [{ role: "user", content }],
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

/** grok-imagine models accept a `quality` dial; "low" is cheaper/faster and
 *  sufficient for visualization images. */
function imagesApiExtraParams(model: string): Record<string, unknown> {
  return /imagine/i.test(model) ? { quality: "low" } : {};
}

async function callOpenAIImagesGenerationsApi(
  prompt: string,
  model: string,
  isSubscriptionMode: boolean
): Promise<Response> {
  const apiKey = multiApiKeyPolling(
    isSubscriptionMode
      ? (OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || OPENAI_COMPATIBLE_API_KEY)
      : OPENAI_COMPATIBLE_API_KEY
  );

  return fetch(`${OPENAI_COMPATIBLE_API_BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, prompt, n: 1, ...imagesApiExtraParams(model) }),
  });
}

/** Image-to-image edits for image-only models use the standard multipart
 *  `/v1/images/edits` endpoint. */
async function callOpenAIImagesEditsApi(
  prompt: string,
  model: string,
  isSubscriptionMode: boolean,
  inputImage: { mimeType: string; data: string }
): Promise<Response> {
  const apiKey = multiApiKeyPolling(
    isSubscriptionMode
      ? (OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || OPENAI_COMPATIBLE_API_KEY)
      : OPENAI_COMPATIBLE_API_KEY
  );

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", "1");
  for (const [key, value] of Object.entries(imagesApiExtraParams(model))) {
    form.append(key, String(value));
  }
  const bytes = new Uint8Array(Buffer.from(inputImage.data, "base64"));
  form.append(
    "image",
    new Blob([bytes], { type: inputImage.mimeType }),
    `input.${inputImage.mimeType.split("/")[1] || "png"}`
  );

  return fetch(`${OPENAI_COMPATIBLE_API_BASE_URL}/v1/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}

function truncateBase64ForLog(str: string): string {
  return str.replace(/[A-Za-z0-9+/]{80,}={0,2}/g, "<base64>");
}

function detectRawBase64Image(str: string): string | null {
  const trimmed = str.replace(/\s/g, "");
  if (trimmed.length < 200 || !/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
    return null;
  }
  const mime =
    trimmed.startsWith("/9j/") ? "image/jpeg"
    : trimmed.startsWith("iVBOR") ? "image/png"
    : trimmed.startsWith("UklGR") ? "image/webp"
    : trimmed.startsWith("R0lGOD") ? "image/gif"
    : null;
  return mime ? `data:${mime};base64,${trimmed}` : null;
}

function findDataUrlDeep(obj: unknown, depth = 0): string | null {
  if (depth > 12 || obj == null) return null;

  if (typeof obj === "string") {
    if (obj.startsWith("data:image/")) {
      return obj.replace(/\s/g, "");
    }
    const match = obj.match(/data:(image\/[a-zA-Z+]+);base64,([A-Za-z0-9+/=\s]+)/);
    if (match) {
      return `data:${match[1]};base64,${match[2].replace(/\s/g, "")}`;
    }
    const raw = detectRawBase64Image(obj);
    if (raw) return raw;
    return null;
  }

  const children = Array.isArray(obj)
    ? obj
    : typeof obj === "object"
      ? Object.values(obj as Record<string, unknown>)
      : [];

  for (const child of children) {
    const found = findDataUrlDeep(child, depth + 1);
    if (found) return found;
  }
  return null;
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
      if (part.type === "image_url") {
        const url =
          typeof part.image_url === "string"
            ? part.image_url
            : part.image_url?.url;
        if (url) return url.replace(/\s/g, "");
      }
      if (part.type === "image" && part.source?.data) {
        const mime = part.source.media_type || "image/png";
        return `data:${mime};base64,${part.source.data}`;
      }
      if (part.type === "image" && part.image_url?.url) {
        return part.image_url.url.replace(/\s/g, "");
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

  return findDataUrlDeep(data);
}

/** Extract an image from an `/v1/images/generations` (or `/edits`) response.
 *  Returns a data URL, or a remote URL that the caller must download. */
function extractFromImagesResponse(data: any): string | null {
  const items = data?.data;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (typeof item?.b64_json === "string" && item.b64_json) {
        const b64 = item.b64_json.replace(/\s/g, "");
        const mime = b64.startsWith("/9j/") ? "image/jpeg" : "image/png";
        return `data:${mime};base64,${b64}`;
      }
      if (typeof item?.url === "string" && item.url) {
        return item.url;
      }
    }
  }
  return findDataUrlDeep(data);
}

/** Download a remote image URL returned by the images API and inline it as a
 *  base64 data URL (the app persists images as base64 in the DB). */
async function fetchUrlAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
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
  email: string | null | undefined,
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
    if (
      signature &&
      ACCESS_PASSWORDS.length > 0 &&
      verifySignature(signature, ACCESS_PASSWORDS, Date.now())
    ) {
      return true;
    }
    // Identity-bound free access (FREE_ACCESS_EMAILS) — no password needed.
    return isFreeAccessEmail(email);
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
    const hasAccess = await verifyModeAccess(
      session.user.id,
      session.user.email,
      mode,
      signature
    );
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
    const { text, studentAge, useChinese, image } = body as {
      text: string;
      studentAge: number;
      useChinese?: boolean;
      mode?: string;
      image?: string;
    };

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

    const errors: string[] = [];
    let imageDataUrl: string | null = null;

    if (ZENMUX_API_KEY) {
      try {
        const response = await callZenMuxApi(prompt, IMAGE_MODEL, inputImage);
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
        const response = await callGoogleNativeApi(prompt, IMAGE_MODEL, inputImage);
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
      const isSubscriptionMode = body.mode === "subscription";

      // Image-only models (grok-imagine, dall-e, gpt-image, flux, ...) are
      // served by the images endpoint, not chat completions.
      const attemptImagesApi = async (): Promise<void> => {
        try {
          const response = isTranslation && inputImage
            ? await callOpenAIImagesEditsApi(prompt, IMAGE_MODEL, isSubscriptionMode, inputImage)
            : await callOpenAIImagesGenerationsApi(prompt, IMAGE_MODEL, isSubscriptionMode);
          if (response.ok) {
            const data = await response.json();
            let extracted = extractFromImagesResponse(data);
            if (extracted && /^https?:\/\//.test(extracted)) {
              const downloaded = await fetchUrlAsDataUrl(extracted);
              if (downloaded) extracted = downloaded;
            }
            if (extracted) {
              imageDataUrl = extracted;
            } else {
              errors.push(
                `OpenAI-images (200): could not extract image. ${truncateBase64ForLog(JSON.stringify(data)).substring(0, 600)}`
              );
            }
          } else {
            const errorText = await response.text();
            errors.push(`OpenAI-images (${response.status}): ${errorText.substring(0, 200)}`);
          }
        } catch (e) {
          errors.push(`OpenAI-images: ${e instanceof Error ? e.message : String(e)}`);
        }
      };

      if (isImagesOnlyModel(IMAGE_MODEL)) {
        await attemptImagesApi();
      } else {
        try {
          const response = await callOpenAICompatibleApi(
            prompt,
            IMAGE_MODEL,
            isSubscriptionMode,
            isTranslation ? image : null
          );
          if (response.ok) {
            const data = await response.json();
            imageDataUrl =
              extractFromOpenAIResponse(data) ?? extractBase64FromGeminiResponse(data);
            if (!imageDataUrl) {
              const msg = data?.choices?.[0]?.message;
              const debugInfo = msg
                ? truncateBase64ForLog(JSON.stringify(msg)).substring(0, 600)
                : truncateBase64ForLog(JSON.stringify(data)).substring(0, 600);
              errors.push(
                `OpenAI-compatible (200): could not extract image. message=${debugInfo}`
              );
            }
          } else {
            const errorText = await response.text();
            errors.push(`OpenAI-compatible (${response.status}): ${errorText.substring(0, 200)}`);
            // The gateway rejected the model on chat completions (e.g.
            // "model_not_supported") — retry once via the images endpoint.
            if (isModelNotSupportedForChat(response.status, errorText)) {
              await attemptImagesApi();
            }
          }
        } catch (e) {
          errors.push(`OpenAI-compatible: ${e instanceof Error ? e.message : String(e)}`);
        }
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
