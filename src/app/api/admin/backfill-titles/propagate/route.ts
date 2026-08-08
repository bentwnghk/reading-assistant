import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { propagateTitles } from "@/lib/backfill-titles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await propagateTitles();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[admin/backfill-titles/propagate] Error:", e);
    return NextResponse.json({ error: "Propagation failed" }, { status: 500 });
  }
}
