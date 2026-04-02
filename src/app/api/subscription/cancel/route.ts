export const runtime = "nodejs";

import { auth } from "@/auth";
import {
  cancelSubscription,
  ensureSubscriptionTable,
} from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSubscriptionTable();
    const success = await cancelSubscription(session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
