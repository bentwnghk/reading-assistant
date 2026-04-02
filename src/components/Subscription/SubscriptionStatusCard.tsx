"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import type { SubscriptionStatusResponse } from "@/lib/subscription";

interface SubscriptionStatusCardProps {
  subscription: SubscriptionStatusResponse;
  onManage: () => void;
  onCancel: () => void;
  onReactivate: () => void;
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

function SubscriptionStatusCard({
  subscription,
  onManage,
  onCancel,
  onReactivate,
}: SubscriptionStatusCardProps) {
  const { t } = useTranslation();
  const {
    status,
    plan,
    currentPeriodEnd,
    trialEnd,
    cancelAtPeriodEnd,
  } = subscription;

  const statusLabel = t(`subscription.status.${status}`);

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

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onManage}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          {t("subscription.manageSubscription")}
        </Button>
        {cancelAtPeriodEnd && (status === "active" || status === "trialing") ? (
          <Button size="sm" variant="outline" onClick={onReactivate}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t("subscription.reactivate")}
          </Button>
        ) : !cancelAtPeriodEnd && (status === "active" || status === "trialing") ? (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onCancel}>
            {t("subscription.cancelSubscription")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default SubscriptionStatusCard;
