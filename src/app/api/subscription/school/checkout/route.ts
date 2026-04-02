import { auth } from "@/auth";
import { createSchoolCheckoutSession, ensureSchoolSubscriptionTables, MIN_SEAT_QUANTITY } from "@/lib/school-subscription";
import { getSchoolForUser } from "@/lib/users";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "yearly"]),
  quantity: z.number().int().min(MIN_SEAT_QUANTITY),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "admin" && role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Subscriptions are not configured" },
        { status: 503 }
      );
    }

    const schoolId = await getSchoolForUser(session.user.id);
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school found for your account" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid request: quantity must be at least ${MIN_SEAT_QUANTITY}` },
        { status: 400 }
      );
    }

    await ensureSchoolSubscriptionTables();
    const url = await createSchoolCheckoutSession(
      session.user.id,
      schoolId,
      session.user.email || null,
      session.user.name || null,
      parsed.data.plan,
      parsed.data.quantity
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error creating school checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
