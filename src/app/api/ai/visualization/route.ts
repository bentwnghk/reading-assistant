import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVisualizationPrompt } from "@/constants/readingPrompts";
import { multiApiKeyPolling } from "@/utils/model";

const API_BASE_URL = process.env.OPENAI_COMPATIBLE_API_BASE_URL || "";
const API_KEY = process.env.OPENAI_COMPATIBLE_API_KEY || "";
const SUBSCRIPTION_API_KEY =
  process.env.OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || "";
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";

function extractImageFromResponse(data: any): string | null {
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
        const url = part.image_url.url;
        if (url.startsWith("data:image/")) return url;
      }
      if (part.type === "image" && part.source?.data) {
        const mime = part.source.media_type || "image/png";
        return `data:${mime};base64,${part.source.data}`;
      }
      if (part.type === "text" && typeof part.text === "string") {
        const b64Match = part.text.match(
          /data:image\/[a-zA-Z+]+;base64,([A-Za-z0-9+/=]+)/
        );
        if (b64Match) return `data:image/png;base64,${b64Match[1]}`;
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

    const apiKey = SUBSCRIPTION_API_KEY
      ? multiApiKeyPolling(SUBSCRIPTION_API_KEY)
      : multiApiKeyPolling(API_KEY);

    if (!apiKey || !API_BASE_URL) {
      return NextResponse.json(
        { error: "Image generation service not configured" },
        { status: 503 }
      );
    }

    const chatResponse = await fetch(
      `${API_BASE_URL}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 4096,
        }),
      }
    );

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error(
        "Image generation failed:",
        chatResponse.status,
        errorText
      );
      return NextResponse.json(
        { error: "Image generation failed", details: errorText },
        { status: chatResponse.status }
      );
    }

    const responseData = await chatResponse.json();
    const imageDataUrl = extractImageFromResponse(responseData);

    if (!imageDataUrl) {
      const msg = responseData?.choices?.[0]?.message?.content || "";
      if (msg.includes("```") || msg.length < 200) {
        console.error("No image in response. Response content:", msg.substring(0, 500));
      }
      return NextResponse.json(
        { error: "No image in response" },
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
