import { getSchoolMonthlyPrice } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  const monthlyPrice = parseFloat(process.env.SUBSCRIPTION_MONTHLY_PRICE || "9.99");
  const schoolMonthlyPrice = getSchoolMonthlyPrice();
  const currency = process.env.SUBSCRIPTION_CURRENCY || "usd";

  return NextResponse.json({
    monthly: { amount: monthlyPrice, currency },
    yearly: { amount: monthlyPrice * 10, currency },
    schoolMonthly: { amount: schoolMonthlyPrice, currency },
    schoolYearly: { amount: schoolMonthlyPrice * 10, currency },
  });
}
