import { auth } from "@/auth";
import { getClient } from "@/lib/db";
import { getStripe } from "@/lib/subscription";
import { parseError } from "@/utils/error";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  confirmEmail: z.string().email(),
});

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "super-admin") {
      return NextResponse.json(
        { error: "Super-admins cannot delete their own account" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (
      parsed.data.confirmEmail.toLowerCase() !==
      session.user.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Email does not match" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const subResult = await client.query(
        "SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due') LIMIT 1",
        [userId]
      );

      if (subResult.rows.length > 0 && subResult.rows[0].stripe_subscription_id) {
        try {
          const stripe = getStripe();
          await stripe.subscriptions.cancel(
            subResult.rows[0].stripe_subscription_id
          );
        } catch (stripeErr) {
          console.error("Failed to cancel Stripe subscription, proceeding with deletion:", stripeErr);
        }
      }

      await client.query("DELETE FROM users WHERE id = $1", [userId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json(
      { error: parseError(error) || "Failed to delete account" },
      { status: 500 }
    );
  }
}
