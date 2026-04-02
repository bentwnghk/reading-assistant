export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ensureStripePrices } from "@/lib/subscription";

export async function GET() {
  const monthlyPrice = parseFloat(process.env.SUBSCRIPTION_MONTHLY_PRICE || "9.99");
  const currency = process.env.SUBSCRIPTION_CURRENCY || "usd";

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      await ensureStripePrices();
    } catch (error) {
      console.error("Failed to seed Stripe product/prices:", error);
    }
  }

  return NextResponse.json({
    monthly: { amount: monthlyPrice, currency },
    yearly: { amount: monthlyPrice * 10, currency },
  });
}
