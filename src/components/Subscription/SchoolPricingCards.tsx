"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Users } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscription";

const MIN_SEAT_QUANTITY = 20;

interface SchoolPricingCardsProps {
  monthlyPrice: number;
  currency: string;
  onSelect: (plan: SubscriptionPlan, quantity: number) => void;
}

function SchoolPricingCards({ monthlyPrice, currency, onSelect }: SchoolPricingCardsProps) {
  const { t } = useTranslation();

  const yearlyTotal = monthlyPrice * 10;
  const yearlyPerUser = yearlyTotal / 12;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: monthlyPrice % 1 === 0 ? 0 : 2,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        {t("schoolSubscription.seatInfo")}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("schoolSubscription.seatInfoDesc", { min: MIN_SEAT_QUANTITY })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="text-sm font-medium">{t("subscription.monthly")}</div>
          <div className="text-2xl font-bold">
            {formatter.format(monthlyPrice)}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              / {t("schoolSubscription.perUserMonth")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("schoolSubscription.billedMonthly")}
          </div>
          <QuantitySelector
            monthlyPrice={monthlyPrice}
            currency={currency}
            onSelect={(qty) => onSelect("monthly", qty)}
            planLabel={t("subscription.monthly")}
            formatter={formatter}
          />
        </div>

        <div className="rounded-lg border-2 border-primary p-4 space-y-3 relative">
          <span className="absolute -top-2.5 left-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {t("subscription.saveTwoMonths")}
          </span>
          <div className="text-sm font-medium">{t("subscription.yearly")}</div>
          <div className="text-2xl font-bold">
            {formatter.format(yearlyTotal)}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              / {t("schoolSubscription.perUserYear")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            ~{formatter.format(yearlyPerUser)}/{t("subscription.month").toLowerCase()} {t("schoolSubscription.perUser")}
          </div>
          <QuantitySelector
            monthlyPrice={monthlyPrice}
            currency={currency}
            onSelect={(qty) => onSelect("yearly", qty)}
            planLabel={t("subscription.yearly")}
            isYearly
            formatter={formatter}
          />
        </div>
      </div>
    </div>
  );
}

function QuantitySelector({
  monthlyPrice,
  onSelect,
  planLabel,
  isYearly = false,
  formatter,
}: {
  monthlyPrice: number;
  currency: string;
  onSelect: (quantity: number) => void;
  planLabel: string;
  isYearly?: boolean;
  formatter: Intl.NumberFormat;
}) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(MIN_SEAT_QUANTITY);

  const unitPrice = isYearly ? monthlyPrice * 10 : monthlyPrice;
  const total = unitPrice * quantity;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setQuantity((q) => Math.max(MIN_SEAT_QUANTITY, q - 1))}
          disabled={quantity <= MIN_SEAT_QUANTITY}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <div className="flex items-center justify-center h-7 px-3 rounded-md border border-border bg-muted/50 text-sm font-medium min-w-[60px]">
          {quantity}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setQuantity((q) => q + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <span className="text-xs text-muted-foreground ml-1">
          {t("schoolSubscription.seats")}
        </span>
      </div>
      <div className="text-sm font-semibold">
        {t("schoolSubscription.total")}: {formatter.format(total)}
      </div>
      <Button
        type="button"
        className="w-full"
        onClick={() => onSelect(quantity)}
      >
        {t("schoolSubscription.subscribeWithSeats", { plan: planLabel, seats: quantity })}
      </Button>
    </div>
  );
}

export default SchoolPricingCards;
