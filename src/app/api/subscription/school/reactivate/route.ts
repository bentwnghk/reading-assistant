import { auth } from "@/auth";
import { reactivateSchoolSubscription, ensureSchoolSubscriptionTables } from "@/lib/school-subscription";
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

    const schoolId = await getSchoolForUser(session.user.id);
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school found for your account" },
        { status: 400 }
      );
    }

    await ensureSchoolSubscriptionTables();
    const success = await reactivateSchoolSubscription(session.user.id, schoolId);

    if (!success) {
      return NextResponse.json(
        { error: "No active school subscription found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reactivating school subscription:", error);
    return NextResponse.json(
      { error: "Failed to reactivate school subscription" },
      { status: 500 }
    );
  }
}
