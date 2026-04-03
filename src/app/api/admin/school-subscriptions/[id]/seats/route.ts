import { auth } from "@/auth"
import { ensureSchoolSubscriptionTables } from "@/lib/school-subscription"
import { getClient } from "@/lib/db"
import { getSchoolForUser } from "@/lib/users"
import { NextResponse } from "next/server"

export interface SeatUser {
  user_id: string
  user_name: string | null
  user_email: string | null
  user_role: string
  first_accessed_at: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  await ensureSchoolSubscriptionTables()

  const client = await getClient()
  try {
    const subResult = await client.query(
      `SELECT school_id, current_period_start, school_name
       FROM school_subscriptions ss
       LEFT JOIN schools s ON s.id = ss.school_id
       WHERE ss.id = $1`,
      [id]
    )

    if (subResult.rows.length === 0) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    const subscription = subResult.rows[0]
    const schoolId = subscription.school_id

    if (role === "admin") {
      const adminSchoolId = await getSchoolForUser(session.user.id)
      if (adminSchoolId !== schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const result = await client.query(
      `SELECT
         u.id as user_id,
         u.name as user_name,
         u.email as user_email,
         COALESCE(ur.role, 'student') as user_role,
         ssu.first_accessed_at
       FROM school_subscription_usage ssu
       JOIN users u ON u.id = ssu.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE ssu.school_subscription_id = $1
         AND ssu.billing_period_start = $2
       ORDER BY ssu.first_accessed_at DESC`,
      [id, subscription.current_period_start]
    )

    return NextResponse.json({
      school_name: subscription.school_name,
      users: result.rows as SeatUser[],
    })
  } catch (error) {
    console.error("[admin/school-subscriptions/id/seats] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch seat users" },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
