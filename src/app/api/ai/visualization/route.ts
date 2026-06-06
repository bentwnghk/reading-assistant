import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateVisualizationPrompt } from "@/constants/readingPrompts";
import { multiApiKeyPolling } from "@/utils/model";

const API_BASE_URL = process.env.OPENAI_COMPATIBLE_API_BASE_URL || "";
const API_KEY = process.env.OPENAI_COMPATIBLE_API_KEY || "";
const SUBSCRIPTION_API_KEY =
  process.env.OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || "";
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";

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

    const imageResponse = await fetch(
      `${API_BASE_URL}/v1/images/generations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt,
          n: 1,
          size: "2048x1152",
          response_format: "b64_json",
        }),
      }
    );

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error(
        "Image generation failed:",
        imageResponse.status,
        errorText
      );
      return NextResponse.json(
        { error: "Image generation failed", details: errorText },
        { status: imageResponse.status }
      );
    }

    const imageData = await imageResponse.json();

    let base64Data: string | null = null;
    if (imageData.data?.[0]?.b64_json) {
      base64Data = imageData.data[0].b64_json;
    } else if (imageData.data?.[0]?.url) {
      return NextResponse.json({ image: imageData.data[0].url });
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "No image data in response" },
        { status: 502 }
      );
    }

    const dataUrl = `data:image/png;base64,${base64Data}`;

    return NextResponse.json({ image: dataUrl });
  } catch (error) {
    console.error("Visualization API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
