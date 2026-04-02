"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSubscription from "@/hooks/useSubscription";
import PricingCards from "./PricingCards";
import SubscriptionStatusCard from "./SubscriptionStatusCard";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscription";

interface SubscriptionPanelProps {
  monthlyPrice: number;
  currency: string;
  disabled?: boolean;
}

function SubscriptionPanel({ monthlyPrice, currency, disabled }: SubscriptionPanelProps) {
  const { t } = useTranslation();
  const {
    subscription,
    loading,
    createCheckout,
    openPortal,
    cancelSubscription,
    reactivateSubscription,
    switchPlan,
  } = useSubscription();
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("subscription");
    if (result === "success") {
      toast.success(t("subscription.checkoutSuccess"));
      window.history.replaceState(null, "", "/");
    } else if (result === "canceled") {
      toast.info(t("subscription.checkoutCanceled"));
      window.history.replaceState(null, "", "/");
    }
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscription) return null;

  if (disabled && !subscription.hasSubscription) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground">
          {t("subscription.disabledBySchoolSubscription")}
        </p>
      </div>
    );
  }

  return (
    <>
      {subscription.hasSubscription ? (
        <div className="space-y-4">
          <SubscriptionStatusCard
            subscription={subscription}
            monthlyPrice={monthlyPrice}
            currency={currency}
            onManage={disabled ? () => {} : openPortal}
            onCancel={disabled ? () => {} : () => setCanceling(true)}
            onReactivate={disabled ? () => {} : reactivateSubscription}
            onSwitchPlan={disabled ? async () => false : switchPlan}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {subscription.status === "past_due" && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md p-2">
              {t("subscription.pastDueWarning")}
              <Button size="sm" variant="outline" className="ml-auto" onClick={openPortal}>
                {t("subscription.updatePayment")}
              </Button>
            </div>
          )}
          <PricingCards
            monthlyPrice={monthlyPrice}
            currency={currency}
            onSelect={(plan: SubscriptionPlan) => createCheckout(plan)}
          />
        </div>
      )}

      {canceling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm mx-4 space-y-4">
            <p className="text-sm">{t("subscription.cancelConfirm")}</p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setCanceling(false)}>
                {t("setting.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  cancelSubscription();
                  setCanceling(false);
                }}
              >
                {t("setting.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SubscriptionPanel;
