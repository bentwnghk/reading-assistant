import { NextRequest, NextResponse } from "next/server";
import { parseError } from "@/utils/error";
import { invalid, requireStaff } from "@/lib/language-check-learn-http";
import { listVocabularyActivity } from "@/lib/vocabulary-activity";
import { analyticsActivityQuerySchema } from "@/lib/vocabulary-analytics-schema";

/** Scoped vocabulary activity feed for staff. */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff();
    if ("response" in staff) return staff.response;
    const parsed = analyticsActivityQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return invalid(parsed.error);
    const { mine, ...rest } = parsed.data;
    return NextResponse.json(
      await listVocabularyActivity(staff.scope, {
        ...rest,
        mineTeacherId: mine === "1" ? staff.userId : undefined,
      })
    );
  } catch (error) {
    console.error("Error listing vocabulary activity:", error);
    return NextResponse.json({ error: parseError(error) }, { status: 500 });
  }
}
