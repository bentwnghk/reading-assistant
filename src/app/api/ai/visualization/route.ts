import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVisualizationPrompt } from "@/constants/readingPrompts";
import { multiApiKeyPolling } from "@/utils/model";

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
  model: string
): Promise<Response> {
  const apiKey = multiApiKeyPolling(
    OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || OPENAI_COMPATIBLE_API_KEY
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
            imageSize: "2K",
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
      /data:image\/[a-zA-Z+]+;base64,([A-Za-z0-9+/=]+)/
    );
    if (b64Match) return `data:image/png;base64,${b64Match[1]}`;
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
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, studentAge } = body as { text: string; studentAge: number };

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 }
      );
    }

    const age = typeof studentAge === "number" ? studentAge : 13;
    const prompt = generateVisualizationPrompt(age, text);

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
        const response = await callOpenAICompatibleApi(prompt, IMAGE_MODEL);
        if (response.ok) {
          const data = await response.json();
          imageDataUrl = extractFromOpenAIResponse(data);
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

    return NextResponse.json({ image: imageDataUrl });
  } catch (error) {
    console.error("Visualization API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
