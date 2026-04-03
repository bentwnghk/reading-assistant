"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSchoolSubscription from "@/hooks/useSchoolSubscription";
import SchoolPricingCards from "./SchoolPricingCards";
import SchoolSubscriptionStatusCard from "./SchoolSubscriptionStatusCard";
import SchoolSubscriptionReadOnlyCard from "./SchoolSubscriptionReadOnlyCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/subscription";

interface SchoolSubscriptionPanelProps {
  monthlyPrice: number;
  currency: string;
}

function SchoolSubscriptionPanel({ monthlyPrice, currency }: SchoolSubscriptionPanelProps) {
  const { t } = useTranslation();
  const {
    subscription,
    loading,
    isAdmin,
    createCheckout,
    openPortal,
    cancelSubscription,
    reactivateSubscription,
    switchPlan,
    updateQuantity,
  } = useSchoolSubscription();
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("school_subscription");
    if (result === "success") {
      toast.success(t("schoolSubscription.checkoutSuccess"));
      window.history.replaceState(null, "", "/");
    } else if (result === "canceled") {
      toast.info(t("schoolSubscription.checkoutCanceled"));
      window.history.replaceState(null, "", "/");
    }
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscription) return null;

  if (!subscription.hasSubscription && !isAdmin) return null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{t("schoolSubscription.title")}</h3>
        <p className="text-xs text-muted-foreground">{t("schoolSubscription.description")}</p>
      </div>

      {isAdmin ? (
        subscription.hasSubscription ? (
          <SchoolSubscriptionStatusCard
            subscription={subscription}
            monthlyPrice={monthlyPrice}
            currency={currency}
            onManage={openPortal}
            onCancel={() => setCanceling(true)}
            onReactivate={reactivateSubscription}
            onSwitchPlan={switchPlan}
            onUpdateQuantity={updateQuantity}
          />
        ) : (
          <SchoolPricingCards
            monthlyPrice={monthlyPrice}
            currency={currency}
            onSelect={(plan: SubscriptionPlan, quantity: number) =>
              createCheckout(plan, quantity)
            }
          />
        )
      ) : subscription.hasSubscription ? (
        <SchoolSubscriptionReadOnlyCard subscription={subscription} />
      ) : null}

      {canceling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm mx-4 space-y-4">
            <p className="text-sm">{t("schoolSubscription.cancelConfirm")}</p>
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
    </div>
  );
}

export default SchoolSubscriptionPanel;
