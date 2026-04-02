export const runtime = "nodejs";

import { auth } from "@/auth";
import { syncSubscriptionFromStripe } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Subscriptions are not configured" },
        { status: 503 }
      );
    }

    const success = await syncSubscriptionFromStripe(session.user.id);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
