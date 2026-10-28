import { NextRequest, NextResponse } from "next/server";
import { parseError } from "@/utils/error";
import { invalid, requireStaff } from "@/lib/language-check-learn-http";
import { getVocabularyAnalytics, safeTimeZone } from "@/lib/vocabulary-activity";
import { analyticsDashboardQuerySchema } from "@/lib/vocabulary-analytics-schema";

/** Staff vocabulary dashboard (teacher → their classes, admin → school, super-admin → all). */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff();
    if ("response" in staff) return staff.response;
    const parsed = analyticsDashboardQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return invalid(parsed.error);
    const { tz, mine, ...rest } = parsed.data;
    return NextResponse.json(
      await getVocabularyAnalytics(staff.scope, {
        ...rest,
        mineTeacherId: mine === "1" ? staff.userId : undefined,
        timeZone: safeTimeZone(tz),
      })
    );
  } catch (error) {
    console.error("Error loading vocabulary analytics:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
