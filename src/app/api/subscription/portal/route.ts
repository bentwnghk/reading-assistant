import { auth } from "@/auth";
import {
  createPortalSession,
  ensureSubscriptionTable,
} from "@/lib/subscription";
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

    await ensureSubscriptionTable();
    const url = await createPortalSession(
      session.user.id,
      session.user.email || null,
      session.user.name || null
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
