import { auth } from "@/auth";
import { switchSchoolSubscriptionPlan, ensureSchoolSubscriptionTables } from "@/lib/school-subscription";
import { getSchoolForUser } from "@/lib/users";
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

    const role = session.user.role;
    if (role !== "admin" && role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schoolId = await getSchoolForUser(session.user.id);
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school found for your account" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { plan } = parsed.data as { plan: SubscriptionPlan };

    await ensureSchoolSubscriptionTables();
    const success = await switchSchoolSubscriptionPlan(session.user.id, schoolId, plan);

    if (!success) {
      return NextResponse.json(
        { error: "No active school subscription found or already on this plan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error switching school subscription plan:", error);
    return NextResponse.json(
      { error: "Failed to switch school subscription plan" },
      { status: 500 }
    );
  }
}
