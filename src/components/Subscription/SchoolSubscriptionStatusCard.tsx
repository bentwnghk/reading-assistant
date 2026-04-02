"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  CreditCard,
  Minus,
  Plus,
  ShieldCheck,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/subscription";

const MIN_SEAT_QUANTITY = 20;

interface SchoolSubscriptionStatusCardProps {
  subscription: {
    schoolName: string | null;
    status: SubscriptionStatus;
    plan: SubscriptionPlan | null;
    quantity: number;
    seatsUsed: number;
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
  };
  monthlyPrice: number;
  currency: string;
  onManage: () => void;
  onCancel: () => void;
  onReactivate: () => void;
  onSwitchPlan: (plan: SubscriptionPlan) => Promise<boolean>;
  onUpdateQuantity: (quantity: number) => Promise<boolean>;
}

function SchoolSubscriptionStatusCard({
  subscription,
  monthlyPrice,
  currency,
  onManage,
  onCancel,
  onReactivate,
  onSwitchPlan,
  onUpdateQuantity,
}: SchoolSubscriptionStatusCardProps) {
  const { t } = useTranslation();
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [newQuantity, setNewQuantity] = useState(subscription.quantity);
  const [switching, setSwitching] = useState(false);
  const [updatingQty, setUpdatingQty] = useState(false);

  const {
    schoolName,
    status,
    plan,
    quantity,
    seatsUsed,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    trialEnd,
  } = subscription;

  const isActive = status === "active" || status === "trialing";
  const seatPercent = quantity > 0 ? Math.min(100, Math.round((seatsUsed / quantity) * 100)) : 0;
  const seatsRemaining = Math.max(0, quantity - seatsUsed);

  const statusColor = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    past_due: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    canceled: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    incomplete: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    incomplete_expired: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    unpaid: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    paused: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  }[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";

  const handleSwitchPlan = async (newPlan: SubscriptionPlan) => {
    setSwitching(true);
    const success = await onSwitchPlan(newPlan);
    setSwitching(false);
    if (!success) {
      alert(t("subscription.switchPlanError"));
    }
  };

  const handleUpdateQuantity = async () => {
    if (newQuantity === quantity) {
      setEditingQuantity(false);
      return;
    }
    setUpdatingQty(true);
    const success = await onUpdateQuantity(newQuantity);
    setUpdatingQty(false);
    if (success) {
      setEditingQuantity(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{schoolName}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
          {t(`subscription.status.${status}`)}
        </span>
      </div>

      {plan && (
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span>{t("subscription.currentPlan")}:</span>
          <span className="font-medium">
            {t(`subscription.${plan}`)}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{t("schoolSubscription.seatUsage")}</span>
          </div>
          <span className="font-medium">
            {seatsUsed} / {quantity}
            <span className="text-muted-foreground ml-1">({seatsRemaining} {t("schoolSubscription.available")})</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
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

      {trialEnd && status === "trialing" && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md p-2">
          <Calendar className="h-4 w-4 shrink-0" />
          {t("subscription.trialEndsAt")}: {formatDate(trialEnd)}
        </div>
      )}

      {status === "past_due" && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md p-2">
          <span>{t("subscription.pastDueWarning")}</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={onManage}>
            {t("subscription.updatePayment")}
          </Button>
        </div>
      )}

      {cancelAtPeriodEnd && currentPeriodEnd && status !== "canceled" && (
        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-md p-2">
          <span>{t("subscription.canceledInfo", { date: formatDate(currentPeriodEnd) })}</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={onReactivate}>
            {t("subscription.reactivate")}
          </Button>
        </div>
      )}

      {currentPeriodEnd && !cancelAtPeriodEnd && status !== "canceled" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {t("subscription.nextBillingDate")}: {formatDate(currentPeriodEnd)}
        </div>
      )}

      {isActive && (
        <div className="pt-2 border-t border-border space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            {t("schoolSubscription.adminControls")}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={onManage}>
              {t("subscription.manageSubscription")}
            </Button>

            {plan && (
              <Button
                size="sm"
                variant="outline"
                disabled={switching}
                onClick={() => handleSwitchPlan(plan === "monthly" ? "yearly" : "monthly")}
              >
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                {plan === "monthly"
                  ? t("subscription.switchToYearly")
                  : t("subscription.switchToMonthly")}
              </Button>
            )}

            {!cancelAtPeriodEnd ? (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 dark:text-red-400"
                onClick={onCancel}
              >
                {t("subscription.cancelSubscription")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onReactivate}>
                {t("subscription.reactivate")}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              {t("schoolSubscription.updateSeats")}
            </div>
            {editingQuantity ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setNewQuantity((q) => Math.max(MIN_SEAT_QUANTITY, q - 1))}
                  disabled={newQuantity <= MIN_SEAT_QUANTITY}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="flex items-center justify-center h-7 px-3 rounded-md border border-border bg-muted/50 text-sm font-medium min-w-[60px]">
                  {newQuantity}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setNewQuantity((q) => q + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <div className="text-xs text-muted-foreground ml-1">
                  ({currency === "usd" ? "$" : ""}{((plan === "yearly" ? monthlyPrice * 10 : monthlyPrice) * newQuantity).toFixed(2)}/{plan === "yearly" ? t("subscription.year").toLowerCase() : t("subscription.month").toLowerCase()})
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto"
                  disabled={updatingQty || newQuantity === quantity}
                  onClick={handleUpdateQuantity}
                >
                  {updatingQty ? "..." : t("setting.save")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingQuantity(false);
                    setNewQuantity(quantity);
                  }}
                >
                  {t("setting.cancel")}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewQuantity(quantity);
                  setEditingQuantity(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("schoolSubscription.changeSeats")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolSubscriptionStatusCard;
