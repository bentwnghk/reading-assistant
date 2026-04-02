import { auth } from "@/auth";
import { getSchoolSubscriptionForUser, ensureSchoolSubscriptionTables } from "@/lib/school-subscription";
import { getSchoolForUser } from "@/lib/users";
import { getUserRole } from "@/lib/users";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSchoolSubscriptionTables();

    const schoolId = await getSchoolForUser(session.user.id);
    if (!schoolId) {
      return NextResponse.json({
        hasSubscription: false,
        schoolName: null,
        status: "inactive",
        plan: null,
        quantity: 20,
        seatsUsed: 0,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        isAdmin: false,
      });
    }

    const role = await getUserRole(session.user.id, session.user.email);
    const isAdmin = role === "admin" || role === "super-admin";

    const status = await getSchoolSubscriptionForUser(session.user.id);

    if (!status) {
      return NextResponse.json({
        hasSubscription: false,
        schoolName: null,
        status: "inactive",
        plan: null,
        quantity: 20,
        seatsUsed: 0,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        isAdmin,
      });
    }

    return NextResponse.json({ ...status, isAdmin });
  } catch (error) {
    console.error("Error fetching school subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch school subscription status" },
      { status: 500 }
    );
  }
}
