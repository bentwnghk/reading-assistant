import { auth } from "@/auth";
import { switchSubscriptionPlan } from "@/lib/subscription";
import { NextResponse } from "next/server";
import { z } from "zod";

const switchPlanSchema = z.object({
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
    const parsed = switchPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request: plan must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }

    const success = await switchSubscriptionPlan(
      session.user.id,
      parsed.data.plan
    );

    if (!success) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error switching plan:", error);
    return NextResponse.json(
      { error: "Failed to switch plan" },
      { status: 500 }
    );
  }
}
