"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SchoolSubscriptionStatusResponse,
} from "@/lib/school-subscription";
import type { SubscriptionPlan } from "@/lib/subscription";

interface UseSchoolSubscriptionReturn {
  subscription: (SchoolSubscriptionStatusResponse & { isAdmin: boolean }) | null;
  loading: boolean;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  createCheckout: (plan: SubscriptionPlan, quantity: number) => Promise<void>;
  openPortal: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  switchPlan: (plan: SubscriptionPlan) => Promise<boolean>;
  updateQuantity: (quantity: number) => Promise<boolean>;
}

export default function useSchoolSubscription(): UseSchoolSubscriptionReturn {
  const [subscription, setSubscription] =
    useState<(SchoolSubscriptionStatusResponse & { isAdmin: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/school/status");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch school subscription status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const createCheckout = useCallback(
    async (plan: SubscriptionPlan, quantity: number) => {
      try {
        const response = await fetch("/api/subscription/school/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, quantity }),
        });
        if (!response.ok) throw new Error("Failed to create checkout");
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        }
      } catch (error) {
        console.error("Failed to create school checkout session:", error);
      }
    },
    []
  );

  const openPortal = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/school/portal", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to create portal session");
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to create school portal session:", error);
    }
  }, []);

  const cancelSubscriptionAction = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/school/cancel", {
        method: "POST",
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("Failed to cancel school subscription:", error);
    }
  }, [fetchStatus]);

  const reactivateSubscriptionAction = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/school/reactivate", {
        method: "POST",
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("Failed to reactivate school subscription:", error);
    }
  }, [fetchStatus]);

  const switchPlanAction = useCallback(
    async (plan: SubscriptionPlan): Promise<boolean> => {
      try {
        const response = await fetch("/api/subscription/school/switch-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (!response.ok) return false;
        await fetchStatus();
        return true;
      } catch (error) {
        console.error("Failed to switch school subscription plan:", error);
        return false;
      }
    },
    [fetchStatus]
  );

  const updateQuantityAction = useCallback(
    async (quantity: number): Promise<boolean> => {
      try {
        const response = await fetch("/api/subscription/school/update-quantity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        if (!response.ok) return false;
        await fetchStatus();
        return true;
      } catch (error) {
        console.error("Failed to update school subscription quantity:", error);
        return false;
      }
    },
    [fetchStatus]
  );

  return {
    subscription,
    loading,
    refetch: fetchStatus,
    isAdmin: subscription?.isAdmin ?? false,
    createCheckout,
    openPortal,
    cancelSubscription: cancelSubscriptionAction,
    reactivateSubscription: reactivateSubscriptionAction,
    switchPlan: switchPlanAction,
    updateQuantity: updateQuantityAction,
  };
}
