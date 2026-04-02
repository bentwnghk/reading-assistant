export const runtime = "nodejs";

import { auth } from "@/auth";
import { verifySubscriptionAccess, ensureSubscriptionTable } from "@/lib/subscription";
import { NextResponse, type NextRequest } from "next/server";

const API_PROXY_BASE_URL = process.env.OPENAI_COMPATIBLE_API_BASE_URL || "";
const SUBSCRIPTION_API_KEY = process.env.OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY || "";

async function handleRequest(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 401, message: "Unauthorized", status: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  await ensureSubscriptionTable();
  const hasAccess = await verifySubscriptionAccess(session.user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: { code: 403, message: "No active subscription", status: "FORBIDDEN" } },
      { status: 403 }
    );
  }

  if (!API_PROXY_BASE_URL) {
    return NextResponse.json(
      { error: { code: 500, message: "API base URL not configured" } },
      { status: 500 }
    );
  }

  if (!SUBSCRIPTION_API_KEY) {
    return NextResponse.json(
      { error: { code: 500, message: "Subscription API key not configured" } },
      { status: 500 }
    );
  }

  let body;
  if (req.method.toUpperCase() !== "GET") {
    body = await req.json();
  }

  const path = req.nextUrl.pathname.replace("/api/ai/subscription/", "");
  const params = req.nextUrl.searchParams.toString();

  try {
    let url = `${API_PROXY_BASE_URL}/${decodeURIComponent(path)}`;
    if (params) url += `?${params}`;

    const payload: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        Authorization: `Bearer ${SUBSCRIPTION_API_KEY}`,
      },
    };
    if (body) payload.body = JSON.stringify(body);
    const response = await fetch(url, payload);
    return new NextResponse(response.body, response);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
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

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

export async function PUT(req: NextRequest) {
  return handleRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req);
}
