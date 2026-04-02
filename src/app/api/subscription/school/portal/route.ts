import { auth } from "@/auth";
import { createSchoolPortalSession, ensureSchoolSubscriptionTables } from "@/lib/school-subscription";
import { getSchoolForUser } from "@/lib/users";
import { NextResponse } from "next/server";

export async function POST() {
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

    await ensureSchoolSubscriptionTables();
    const url = await createSchoolPortalSession(
      session.user.id,
      schoolId,
      session.user.email || null,
      session.user.name || null
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error creating school portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
