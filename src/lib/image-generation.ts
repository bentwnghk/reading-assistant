import { multiApiKeyPolling } from "@/utils/model";
import { verifySubscriptionAccess } from "@/lib/subscription";
import { isFreeAccessEmail } from "@/lib/free-access";
import { hasActiveTrial } from "@/lib/trial";
import { verifySignature, parseAccessPasswords } from "@/utils/signature";

const ACCESS_PASSWORDS = parseAccessPasswords(process.env.ACCESS_PASSWORD || "");

const ZENMUX_API_KEY = process.env.ZENMUX_API_KEY || "";

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

export const IMAGE_MODEL =
  process.env.IMAGE_MODEL || "google/gemini-3.1-flash-lite-image";

/** Models users may pick in Settings → Models → Visualization Model.
 *  Client selections are validated against this list; anything else falls
 *  back to the server-side IMAGE_MODEL default. */
export const IMAGE_MODEL_OPTIONS = new Set([
  "google/gemini-3.1-flash-lite-image",
  "x-ai/grok-imagine-image-2.0",
  "google/gemini-nano-banana-2.1",
]);

/** Additional image model only admins/super-admins and meter-billing
 *  (mode "local") users may select. */
export const ADMIN_IMAGE_MODEL_OPTIONS = new Set([
  "google/gemini-3.1-flash-image",
]);

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
export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
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
  // Strip a vendor prefix ("google/...") — Gemini-native model URLs take the
  // bare model name.
  const bareModel = model.includes("/") ? model.split("/").pop()! : model;
  const url = `${GOOGLE_API_BASE_URL}/v1beta/models/${bareModel}:generateContent`;

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
 *  sufficient for visualization images.
 *
 *  Edits additionally need an xAI-style resolution: gateways relay the OpenAI
 *  `size` field verbatim into xAI's `resolution` parameter, which only accepts
 *  "1k"/"2k" — the OpenAI default "1024x1024" is rejected with 422. Send "1k"
 *  via both `size` and `resolution` so either mapping style works.
 *
 *  `response_format` must be explicit: xAI defaults to "url", which Zero Data
 *  Retention teams are forbidden from using (the URL variant requires xAI to
 *  store the generated image) — those requests fail with 400. "b64_json" is
 *  always accepted and is what we consume anyway. */
function imagesApiExtraParams(model: string, isEdit: boolean): Record<string, unknown> {
  if (!/imagine/i.test(model)) return {};
  const base = { quality: "low", response_format: "b64_json" };
  return isEdit ? { ...base, size: "1k", resolution: "1k" } : base;
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
    body: JSON.stringify({ model, prompt, n: 1, ...imagesApiExtraParams(model, false) }),
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
  for (const [key, value] of Object.entries(imagesApiExtraParams(model, true))) {
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


export interface ImageGenerationResult {
  image: string | null;
  errors: string[];
}

/** Runs the provider cascade (ZenMux -> Google -> OpenAI-compatible). `image`
 *  (a data URL) turns the call into an image-to-image edit. */
export async function generateImageWithProviders(
  prompt: string,
  model: string,
  mode: string | undefined,
  image?: string | null
): Promise<ImageGenerationResult> {
  const inputImage = image ? parseDataUrl(image) : null;
  const isTranslation = !!inputImage;
    const errors: string[] = [];
    let imageDataUrl: string | null = null;

    if (ZENMUX_API_KEY) {
      try {
        const response = await callZenMuxApi(prompt, model, inputImage);
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
        const response = await callGoogleNativeApi(prompt, model, inputImage);
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
      const isSubscriptionMode = mode === "subscription";

      // Image-only models (grok-imagine, dall-e, gpt-image, flux, ...) are
      // served by the images endpoint, not chat completions.
      const attemptImagesApi = async (): Promise<void> => {
        try {
          const response = isTranslation && inputImage
            ? await callOpenAIImagesEditsApi(prompt, model, isSubscriptionMode, inputImage)
            : await callOpenAIImagesGenerationsApi(prompt, model, isSubscriptionMode);
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

      if (isImagesOnlyModel(model)) {
        await attemptImagesApi();
      } else {
        try {
          const response = await callOpenAICompatibleApi(
            prompt,
            model,
            isSubscriptionMode,
            isTranslation ? image ?? null : null
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

  return { image: imageDataUrl, errors };
}

export async function verifyModeAccess(
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
    if (isFreeAccessEmail(email)) {
      return true;
    }
    // Active free trial (onboarding wizard) — same identity-bound access.
    return hasActiveTrial(userId);
  }
  if (mode === "local") {
    return true;
  }
  return false;
}

/** Validates a user-selected image model against the allowlist (premium
 *  models only for admins/super-admins and meter-billing users). */
export function resolveImageModel(
  requested: unknown,
  role: string | undefined,
  mode: string | undefined
): string {
  const canUsePremium =
    role === "admin" || role === "super-admin" || mode === "local";
  return typeof requested === "string" &&
    (IMAGE_MODEL_OPTIONS.has(requested) ||
      (canUsePremium && ADMIN_IMAGE_MODEL_OPTIONS.has(requested)))
    ? requested
    : IMAGE_MODEL;
}
