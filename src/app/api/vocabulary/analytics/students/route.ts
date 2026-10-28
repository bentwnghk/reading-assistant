import { NextRequest, NextResponse } from "next/server";
import { parseError } from "@/utils/error";
import { invalid, requireStaff } from "@/lib/language-check-learn-http";
import { listAnalyticsStudents } from "@/lib/vocabulary-activity";
import { analyticsStudentsQuerySchema } from "@/lib/vocabulary-analytics-schema";

/** Scoped student options for the analytics filter bar (scope + class only). */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff();
    if ("response" in staff) return staff.response;
    const parsed = analyticsStudentsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return invalid(parsed.error);
    const { mine, ...rest } = parsed.data;
    return NextResponse.json({
      users: await listAnalyticsStudents(staff.scope, {
        ...rest,
        mineTeacherId: mine === "1" ? staff.userId : undefined,
      }),
    });
  } catch (error) {
    console.error("Error listing vocabulary analytics students:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
