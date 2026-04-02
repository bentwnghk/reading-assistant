import { auth } from "@/auth"
import { ensureSubscriptionTable } from "@/lib/subscription"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"

export interface AdminSubscriptionRow {
  id: string
  user_id: string
  user_name: string | null
  user_email: string | null
  stripe_customer_id: string
  stripe_subscription_id: string | null
  status: string
  plan: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
  created_at: string
  updated_at: string
}

export interface AdminSubscriptionStats {
  total: number
  active: number
  trialing: number
  past_due: number
  canceled: number
  inactive: number
  monthlyCount: number
  yearlyCount: number
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await ensureSubscriptionTable()

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")))
  const statusFilter = searchParams.get("status") || ""
  const search = searchParams.get("search") || ""

  const client = await getClient()
  try {
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (statusFilter) {
      conditions.push(`s.status = $${paramIdx++}`)
      params.push(statusFilter)
    }
    if (search) {
      conditions.push(`(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`)
      params.push(`%${search}%`)
      paramIdx++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id ${where}`,
      params
    )
    const total = Number(countResult.rows[0].total)

    const offset = (page - 1) * limit
    const dataResult = await client.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       LEFT JOIN users u ON u.id = s.user_id
       ${where}
       ORDER BY s.updated_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    )

    const statsResult = await client.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'trialing') as trialing,
         COUNT(*) FILTER (WHERE status = 'past_due') as past_due,
         COUNT(*) FILTER (WHERE status = 'canceled') as canceled,
         COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
         COUNT(*) FILTER (WHERE plan = 'monthly') as monthly_count,
         COUNT(*) FILTER (WHERE plan = 'yearly') as yearly_count
       FROM subscriptions`
    )

    return NextResponse.json({
      subscriptions: dataResult.rows as AdminSubscriptionRow[],
      stats: statsResult.rows[0] as AdminSubscriptionStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[admin/subscriptions] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
