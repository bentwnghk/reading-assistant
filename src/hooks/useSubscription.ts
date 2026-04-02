"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SubscriptionStatusResponse,
  SubscriptionPlan,
} from "@/lib/subscription";

interface UseSubscriptionReturn {
  subscription: SubscriptionStatusResponse | null;
  loading: boolean;
  refetch: () => Promise<void>;
  createCheckout: (plan: SubscriptionPlan) => Promise<void>;
  switchPlan: (plan: SubscriptionPlan) => Promise<void>;
  openPortal: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
}

export default function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] =
    useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/status");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const createCheckout = useCallback(
    async (plan: SubscriptionPlan) => {
      try {
        const response = await fetch("/api/subscription/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (!response.ok) throw new Error("Failed to create checkout");
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        }
      } catch (error) {
        console.error("Failed to create checkout session:", error);
      }
    },
    []
  );

  const switchPlanAction = useCallback(
    async (plan: SubscriptionPlan) => {
      try {
        const response = await fetch("/api/subscription/switch-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (!response.ok) throw new Error("Failed to switch plan");
        await fetchStatus();
      } catch (error) {
        console.error("Failed to switch plan:", error);
      }
    },
    [fetchStatus]
  );

  const openPortal = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to create portal session");
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to create portal session:", error);
    }
  }, []);

  const cancelSubscriptionAction = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }
  }, [fetchStatus]);

  const reactivateSubscriptionAction = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/reactivate", {
        method: "POST",
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
    }
  }, [fetchStatus]);

  return {
    subscription,
    loading,
    refetch: fetchStatus,
    createCheckout,
    switchPlan: switchPlanAction,
    openPortal,
    cancelSubscription: cancelSubscriptionAction,
    reactivateSubscription: reactivateSubscriptionAction,
  };
}
