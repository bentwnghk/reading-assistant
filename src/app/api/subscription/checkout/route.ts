export const runtime = "nodejs";

import { auth } from "@/auth";
import {
  createCheckoutSession,
  ensureSubscriptionTable,
} from "@/lib/subscription";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "yearly"]),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request: plan must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }

    await ensureSubscriptionTable();
    const url = await createCheckoutSession(
      session.user.id,
      session.user.email || null,
      session.user.name || null,
      parsed.data.plan
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
