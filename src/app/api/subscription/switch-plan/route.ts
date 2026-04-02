import { auth } from "@/auth";
import {
  switchSubscriptionPlan,
  ensureSubscriptionTable,
} from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/subscription";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  plan: z.enum(["monthly", "yearly"]),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { plan } = parsed.data as { plan: SubscriptionPlan };

    await ensureSubscriptionTable();
    const success = await switchSubscriptionPlan(session.user.id, plan);

    if (!success) {
      return NextResponse.json(
        { error: "No active subscription found or already on this plan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error switching subscription plan:", error);
    return NextResponse.json(
      { error: "Failed to switch subscription plan" },
      { status: 500 }
    );
  }
}
