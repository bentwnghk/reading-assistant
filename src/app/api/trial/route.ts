import { auth } from "@/auth"
import { getTrialStatus, startTrial } from "@/lib/trial"
import { NextResponse } from "next/server"

/** GET /api/trial — the signed-in user's free-trial status. */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await getTrialStatus(session.user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error fetching trial status:", error)
    return NextResponse.json(
      { error: "Failed to fetch trial status" },
      { status: 500 }
    )
  }
}

/** POST /api/trial — start the user's one-time free trial. */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await startTrial(session.user.id)
    if (!status) {
      return NextResponse.json(
        { error: "Free trial is not enabled on this deployment" },
        { status: 403 }
      )
    }
    if (!status.active) {
      // A row already existed and has expired — one trial per user, ever.
      return NextResponse.json(
        { error: "Free trial already used", ...status },
        { status: 409 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error starting trial:", error)
    return NextResponse.json(
      { error: "Failed to start trial" },
      { status: 500 }
    )
  }
}
