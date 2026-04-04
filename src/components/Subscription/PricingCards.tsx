"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscription";

interface PricingCardsProps {
  monthlyPrice: number;
  currency: string;
  onSelect: (plan: SubscriptionPlan) => void;
}

function PricingCards({ monthlyPrice, currency, onSelect }: PricingCardsProps) {
  const { t } = useTranslation();
  const yearlyPrice = monthlyPrice * 10;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: monthlyPrice % 1 === 0 ? 0 : 2,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">{t("subscription.monthly")}</h4>
        </div>
        <div>
          <div className="text-2xl font-bold">{formatter.format(monthlyPrice)}</div>
          <div className="text-sm text-muted-foreground text-right">/{t("subscription.month")}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("schoolSubscription.billedMonthly")}
        </p>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => onSelect("monthly")}
        >
          {t("subscription.subscribe")}
        </Button>
      </div>
      <div className="rounded-lg border-2 border-primary bg-card p-4 space-y-3 relative">
        <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] px-2">
          {t("subscription.saveTwoMonths")}
        </Badge>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">{t("subscription.yearly")}</h4>
        </div>
        <div>
          <div className="text-2xl font-bold">{formatter.format(yearlyPrice)}</div>
          <div className="text-sm text-muted-foreground text-right">/{t("subscription.year")}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatter.format(Math.round((yearlyPrice / 12) * 100) / 100)}/{t("subscription.month")}
        </p>
        <Button
          className="w-full"
          onClick={() => onSelect("yearly")}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {t("subscription.subscribe")}
        </Button>
      </div>
    </div>
  );
}

export default PricingCards;
