export const runtime = "nodejs";

import { auth } from "@/auth";
import { getSubscriptionStatus, ensureSubscriptionTable } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSubscriptionTable();
    const status = await getSubscriptionStatus(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}
