import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getScopedStudents } from "@/lib/users";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const schoolId =
      role === "super-admin" ? searchParams.get("schoolId") || undefined : undefined;
    const students = await getScopedStudents(session.user.id, role, schoolId);
    return NextResponse.json({ students });
  } catch (error) {
    console.error("Failed to fetch scoped students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
