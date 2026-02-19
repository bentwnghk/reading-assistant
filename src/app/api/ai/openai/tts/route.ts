import { NextResponse, type NextRequest } from "next/server";
import { OPENAI_BASE_URL } from "@/constants/urls";

export const runtime = "edge";
export const preferredRegion = [
  "cle1",
  "iad1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
  "hnd1",
  "kix1",
];

const API_PROXY_BASE_URL = process.env.OPENAI_API_BASE_URL || OPENAI_BASE_URL;
const API_KEY = process.env.OPENAI_API_KEY || "";
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "";

async function handler(req: NextRequest) {
  if (req.method.toUpperCase() !== "POST") {
    return NextResponse.json(
      { code: 405, message: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const body = await req.json();
    const { text, voice = "alloy" } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { code: 400, message: "Text is required" },
        { status: 400 }
      );
    }

    if (text.length > 4096) {
      return NextResponse.json(
        { code: 400, message: "Text exceeds maximum length of 4096 characters" },
        { status: 400 }
      );
    }

    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = validVoices.includes(voice) ? voice : "alloy";

    let authorization: string;
    if (ACCESS_PASSWORD && API_KEY) {
      authorization = `Bearer ${API_KEY}`;
    } else {
      authorization = req.headers.get("Authorization") || "";
    }

    const response = await fetch(`${API_PROXY_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: selectedVoice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { code: response.status, message: errorText || "TTS request failed" },
        { status: response.status }
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("TTS error:", error);
      return NextResponse.json(
        { code: 500, message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { code: 500, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export { handler as POST };
