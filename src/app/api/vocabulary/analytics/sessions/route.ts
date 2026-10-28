import { NextRequest, NextResponse } from "next/server";
import { parseError } from "@/utils/error";
import { invalid, requireStaff } from "@/lib/language-check-learn-http";
import { listStaffReviewSessions } from "@/lib/vocabulary-activity";
import { analyticsSessionsQuerySchema } from "@/lib/vocabulary-analytics-schema";

/** Every in-scope learner's review sessions (read only). Detail: /api/vocabulary/review-sessions?id=&userId=. */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff();
    if ("response" in staff) return staff.response;
    const parsed = analyticsSessionsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return invalid(parsed.error);
    const { mine, ...rest } = parsed.data;
    return NextResponse.json(
      await listStaffReviewSessions(staff.scope, {
        ...rest,
        mineTeacherId: mine === "1" ? staff.userId : undefined,
      })
    );
  } catch (error) {
    console.error("Error listing staff vocabulary sessions:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
