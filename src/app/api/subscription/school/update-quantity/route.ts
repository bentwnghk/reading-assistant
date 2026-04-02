import { auth } from "@/auth";
import { updateSchoolSubscriptionQuantity, ensureSchoolSubscriptionTables, MIN_SEAT_QUANTITY } from "@/lib/school-subscription";
import { getSchoolForUser } from "@/lib/users";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
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
      return NextResponse.json(
        { error: `Invalid request: quantity must be at least ${MIN_SEAT_QUANTITY}` },
        { status: 400 }
      );
    }

    await ensureSchoolSubscriptionTables();
    const success = await updateSchoolSubscriptionQuantity(
      session.user.id,
      schoolId,
      parsed.data.quantity
    );

    if (!success) {
      return NextResponse.json(
        { error: "No active school subscription found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating school subscription quantity:", error);
    return NextResponse.json(
      { error: "Failed to update seat quantity" },
      { status: 500 }
    );
  }
}
