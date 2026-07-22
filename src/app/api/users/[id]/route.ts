import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { deleteUser, getUserRole } from "@/lib/users"
import { cancelSubscription } from "@/lib/subscription"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden - super-admin only" }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  const targetRole = await getUserRole(id)
  if (targetRole === "super-admin") {
    return NextResponse.json({ error: "Cannot delete super-admin accounts" }, { status: 400 })
  }

  try {
    try {
      await cancelSubscription(id)
    } catch (error) {
      console.error("Failed to cancel subscription during user deletion (continuing):", error)
    }

    const success = await deleteUser(id)
    if (!success) {
      return NextResponse.json({ error: "User not found or already deleted" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
