"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Calendar,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import type { SubscriptionStatusResponse, SubscriptionPlan } from "@/lib/subscription";

interface SubscriptionStatusCardProps {
  subscription: SubscriptionStatusResponse;
  monthlyPrice: number;
  currency: string;
  onManage: () => void;
  onCancel: () => void;
  onReactivate: () => void;
  onSwitchPlan: (plan: SubscriptionPlan) => Promise<boolean>;
  disabled?: boolean;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  past_due: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  canceled: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
}

function SubscriptionStatusCard({
  subscription,
  monthlyPrice,
  currency,
  onManage,
  onCancel,
  onReactivate,
  onSwitchPlan,
  disabled,
}: SubscriptionStatusCardProps) {
  const { t } = useTranslation();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState(false);
  const {
    status,
    plan,
    currentPeriodEnd,
    trialEnd,
    cancelAtPeriodEnd,
  } = subscription;

  const statusLabel = t(`subscription.status.${status}`);
  const canSwitch = (status === "active" || status === "trialing") && !cancelAtPeriodEnd && !disabled;
  const targetPlan: SubscriptionPlan = plan === "yearly" ? "monthly" : "yearly";
  const yearlyPrice = monthlyPrice * 10;

  const handleSwitchPlan = async () => {
    setSwitching(true);
    setSwitchError(false);
    const ok = await onSwitchPlan(targetPlan);
    setSwitching(false);
    if (!ok) setSwitchError(true);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{t("subscription.currentPlan")}</span>
        </div>
        <div className="flex items-center gap-2">
          {plan && (
            <Badge variant="secondary" className="text-xs">
              {t(`subscription.${plan}`)}
            </Badge>
          )}
          <Badge className={`text-xs ${statusColors[status] || ""}`}>
            {statusLabel}
          </Badge>
        </div>
      </div>

      {status === "trialing" && trialEnd && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md p-2">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t("subscription.trialEndsAt")}: {formatDate(trialEnd)}
          </span>
        </div>
      )}

      {status === "past_due" && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{t("subscription.pastDueWarning")}</span>
        </div>
      )}

      {cancelAtPeriodEnd && currentPeriodEnd && (status === "active" || status === "trialing") && (
        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t("subscription.canceledInfo", { date: formatDate(currentPeriodEnd) })}
          </span>
        </div>
      )}

      {!cancelAtPeriodEnd && currentPeriodEnd && (status === "active" || status === "trialing") && (
        <p className="text-xs text-muted-foreground">
          {t("subscription.nextBillingDate")}: {formatDate(currentPeriodEnd)}
        </p>
      )}

      {/* Plan switch section */}
      {canSwitch && plan && (
        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("subscription.switchPlanTitle")}
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {targetPlan === "yearly"
                ? t("subscription.switchToYearlyDesc", {
                    price: formatPrice(yearlyPrice, currency),
                  })
                : t("subscription.switchToMonthlyDesc", {
                    price: formatPrice(monthlyPrice, currency),
                  })}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={handleSwitchPlan}
              disabled={switching}
            >
              {switching ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
              )}
              {targetPlan === "yearly"
                ? t("subscription.switchToYearly")
                : t("subscription.switchToMonthly")}
            </Button>
          </div>
          {status === "trialing" && (
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              {t("subscription.switchPlanTrialWarning")}
            </p>
          )}
          {switchError && (
            <p className="text-xs text-destructive">{t("subscription.switchPlanError")}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onManage} disabled={disabled}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          {t("subscription.manageSubscription")}
        </Button>
        {!disabled && cancelAtPeriodEnd && (status === "active" || status === "trialing") ? (
          <Button type="button" size="sm" variant="outline" onClick={onReactivate}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t("subscription.reactivate")}
          </Button>
        ) : !disabled && !cancelAtPeriodEnd && (status === "active" || status === "trialing") ? (
          <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onCancel}>
            {t("subscription.cancelSubscription")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default SubscriptionStatusCard;
