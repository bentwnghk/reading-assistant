"use client";

import { useTranslation } from "react-i18next";
import { Building2, Calendar, CreditCard, Lock, Users } from "lucide-react";

interface SchoolSubscriptionReadOnlyCardProps {
  subscription: {
    schoolName: string | null;
    status: string;
    plan: string | null;
    quantity: number;
    seatsUsed: number;
    currentPeriodEnd: string | null;
  };
}

function SchoolSubscriptionReadOnlyCard({
  subscription,
}: SchoolSubscriptionReadOnlyCardProps) {
  const { t } = useTranslation();

  const {
    schoolName,
    plan,
    quantity,
    seatsUsed,
    currentPeriodEnd,
  } = subscription;

  const seatPercent = quantity > 0 ? Math.min(100, Math.round((seatsUsed / quantity) * 100)) : 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/40">
          <Building2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </div>
        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
          {t("schoolSubscription.activeSchoolSubscription")}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {schoolName && (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{schoolName}</span>
          </div>
        )}

        {plan && (
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("subscription.currentPlan")}: {t(`subscription.${plan}`)}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {seatsUsed} / {quantity} {t("schoolSubscription.seatsUsed")}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                seatPercent >= 90
                  ? "bg-red-500"
                  : seatPercent >= 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${seatPercent}%` }}
            />
          </div>
        </div>

        {currentPeriodEnd && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("schoolSubscription.expires")}: {formatDate(currentPeriodEnd)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-green-200/50 dark:border-green-800/50">
        <Lock className="h-3 w-3" />
        {t("schoolSubscription.managedByAdmin")}
      </div>
    </div>
  );
}

export default SchoolSubscriptionReadOnlyCard;
