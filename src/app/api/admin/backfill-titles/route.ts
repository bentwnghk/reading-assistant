import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getBackfillStats, runBackfill, type BackfillEvent } from "@/lib/backfill-titles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const PROVIDERS = [
  "google",
  "openai",
  "openaicompatible",
  "openrouter",
  "deepseek",
  "anthropic",
  "xai",
  "mistral",
] as const;

const optionsSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().min(1).max(120),
  dryRun: z.boolean().default(false),
  onlyEmpty: z.boolean().default(false),
  includeRepository: z.boolean().default(false),
  concurrency: z.number().int().min(1).max(10).default(3),
  maxChars: z.number().int().min(100).max(8000).default(2000),
  limit: z.number().int().min(0).max(100000).default(0),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const stats = await getBackfillStats({
    onlyEmpty: url.searchParams.get("onlyEmpty") === "true",
    includeRepository: url.searchParams.get("includeRepository") === "true",
  });
  return NextResponse.json(stats);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = optionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const opts = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: BackfillEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // controller may be closed after client disconnect
        }
      };
      try {
        await runBackfill(opts, emit, req.signal);
      } catch (e) {
        emit({ type: "fatal", message: e instanceof Error ? e.message : String(e) });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
