import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVisualizationPrompt } from "@/constants/readingPrompts";

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
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";

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

async function callGeminiNativeApi(
  prompt: string,
  model: string
): Promise<Response> {
  const url = `${GOOGLE_API_BASE_URL}/v1/models/${model}:generateContent`;

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
    }),
  });
}

async function callOpenAICompatibleApi(
  prompt: string,
  model: string
): Promise<Response> {
  const apiKey = OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY
    ? OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY
    : OPENAI_COMPATIBLE_API_KEY;

  const keys = apiKey
    .split(",")
    .map((k: string) => k.trim())
    .filter(Boolean);
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];

  return fetch(
    `${OPENAI_COMPATIBLE_API_BASE_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${selectedKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      }),
    }
  );
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

    let imageDataUrl: string | null = null;

    if (GOOGLE_API_KEY) {
      const geminiResponse = await callGeminiNativeApi(prompt, IMAGE_MODEL);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(
          "Gemini native API failed:",
          geminiResponse.status,
          errorText
        );
      } else {
        const data = await geminiResponse.json();
        imageDataUrl = extractBase64FromGeminiResponse(data);
      }
    }

    if (!imageDataUrl && OPENAI_COMPATIBLE_API_KEY && OPENAI_COMPATIBLE_API_BASE_URL) {
      const compatResponse = await callOpenAICompatibleApi(
        prompt,
        IMAGE_MODEL
      );

      if (compatResponse.ok) {
        const data = await compatResponse.json();
        const message = data?.choices?.[0]?.message;

        if (typeof message?.content === "string") {
          const b64Match = message.content.match(
            /data:image\/[a-zA-Z+]+;base64,([A-Za-z0-9+/=]+)/
          );
          if (b64Match) {
            imageDataUrl = `data:image/png;base64,${b64Match[1]}`;
          }
        }

        if (!imageDataUrl && Array.isArray(message?.content)) {
          for (const part of message.content) {
            if (part.type === "image_url" && part.image_url?.url) {
              imageDataUrl = part.image_url.url;
              break;
            }
            if (part.type === "image" && part.source?.data) {
              const mime = part.source.media_type || "image/png";
              imageDataUrl = `data:${mime};base64,${part.source.data}`;
              break;
            }
          }
        }
      } else {
        const errorText = await compatResponse.text();
        console.error(
          "OpenAI-compatible API failed:",
          compatResponse.status,
          errorText
        );
      }
    }

    if (!imageDataUrl) {
      return NextResponse.json(
        {
          error:
            "Image generation failed. Ensure GOOGLE_GENERATIVE_AI_API_KEY is set for direct Gemini API access, or the OpenAI-compatible provider supports image generation.",
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
