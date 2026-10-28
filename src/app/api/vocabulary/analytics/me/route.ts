import { NextRequest, NextResponse } from "next/server";
import { parseError } from "@/utils/error";
import { invalid, requireUser } from "@/lib/language-check-learn-http";
import { getSelfVocabularyAnalytics, safeTimeZone } from "@/lib/vocabulary-activity";
import { analyticsDashboardQuerySchema } from "@/lib/vocabulary-analytics-schema";

/**
 * The signed-in learner's own vocabulary dashboard ("My analytics" on
 * /vocabulary). Any client-supplied userId/classId/mine is stripped — the
 * data is always scoped to the caller, never to a filter.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if ("response" in user) return user.response;
    const parsed = analyticsDashboardQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return invalid(parsed.error);
    const {
      tz,
      userId: _userId,
      classId: _classId,
      mine: _mine,
      range,
    } = parsed.data;
    return NextResponse.json(
      await getSelfVocabularyAnalytics(user.userId, { range, timeZone: safeTimeZone(tz) })
    );
  } catch (error) {
    console.error("Error loading own vocabulary analytics:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
