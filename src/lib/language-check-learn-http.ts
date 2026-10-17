import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isStaffRole, resolveStaffScope } from "./language-check"
import type { LanguageCheckStaffScope } from "./language-check"

type Denied = { response: NextResponse }

export async function requireUser(): Promise<{ userId: string } | Denied> {
  const session = await auth()
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { userId: session.user.id }
}

/** Staff session + the learner scope its role may see (students are refused). */
export async function requireStaff(): Promise<
  { userId: string; scope: LanguageCheckStaffScope } | Denied
> {
  const session = await auth()
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!isStaffRole(session.user.role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  const scope = await resolveStaffScope(session.user.role, session.user.id)
  if (!scope) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { userId: session.user.id, scope }
}

export function invalid(error: { flatten: () => unknown }): NextResponse {
  return NextResponse.json(
    { error: "Invalid request", details: error.flatten() },
    { status: 400 },
  )
}
