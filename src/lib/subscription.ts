import Stripe from "stripe";
import { getClient } from "./db";

export type SubscriptionPlan = "monthly" | "yearly";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | "inactive";

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripeInstance = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeInstance;
}

function getMonthlyPrice(): number {
  return parseFloat(process.env.SUBSCRIPTION_MONTHLY_PRICE || "9.99");
}

function getYearlyPrice(): number {
  return getMonthlyPrice() * 10;
}

function getCurrency(): string {
  return process.env.SUBSCRIPTION_CURRENCY || "usd";
}

function getAppUrl(): string {
  return process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000";
}

let tableEnsured = false;

export async function ensureSubscriptionTable(): Promise<boolean> {
  if (tableEnsured) return true;
  const client = await getClient();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id TEXT NOT NULL,
        stripe_subscription_id TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'inactive'
          CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
        plan TEXT CHECK (plan IN ('monthly', 'yearly')),
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT false,
        trial_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)
    `);
    tableEnsured = true;
    return true;
  } catch (error) {
    console.error("Failed to ensure subscription table:", error);
    return false;
  } finally {
    client.release();
  }
}

async function getSubscriptionRecord(
  userId: string
): Promise<SubscriptionRecord | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as SubscriptionRecord;
  } catch (error) {
    console.error("Failed to get subscription:", error);
    return null;
  } finally {
    client.release();
  }
}

async function upsertSubscriptionRecord(
  userId: string,
  data: {
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
    status: SubscriptionStatus;
    plan?: SubscriptionPlan | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: string | null;
  }
): Promise<SubscriptionRecord | null> {
  const client = await getClient();
  try {
    const existing = await getSubscriptionRecord(userId);
    if (existing) {
      const result = await client.query(
        `UPDATE subscriptions SET
          stripe_customer_id = $1,
          stripe_subscription_id = $2,
          status = $3,
          plan = $4,
          current_period_start = $5,
          current_period_end = $6,
          cancel_at_period_end = $7,
          trial_end = $8,
          updated_at = NOW()
        WHERE user_id = $9
        RETURNING *`,
        [
          data.stripeCustomerId,
          data.stripeSubscriptionId ?? existing.stripe_subscription_id,
          data.status,
          data.plan ?? existing.plan,
          data.currentPeriodStart ?? existing.current_period_start,
          data.currentPeriodEnd ?? existing.current_period_end,
          data.cancelAtPeriodEnd ?? existing.cancel_at_period_end,
          data.trialEnd ?? existing.trial_end,
          userId,
        ]
      );
      return result.rows[0] as SubscriptionRecord;
    } else {
      const result = await client.query(
        `INSERT INTO subscriptions (
          user_id, stripe_customer_id, stripe_subscription_id,
          status, plan, current_period_start, current_period_end,
          cancel_at_period_end, trial_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          userId,
          data.stripeCustomerId,
          data.stripeSubscriptionId ?? null,
          data.status,
          data.plan ?? null,
          data.currentPeriodStart ?? null,
          data.currentPeriodEnd ?? null,
          data.cancelAtPeriodEnd ?? false,
          data.trialEnd ?? null,
        ]
      );
      return result.rows[0] as SubscriptionRecord;
    }
  } catch (error) {
    console.error("Failed to upsert subscription:", error);
    return null;
  } finally {
    client.release();
  }
}

async function getOrCreateStripeCustomer(
  userId: string,
  email: string | null,
  name: string | null
): Promise<string> {
  const existing = await getSubscriptionRecord(userId);
  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await getStripe().customers.create({
    email: email || undefined,
    name: name || undefined,
    metadata: { userId },
  });

  await upsertSubscriptionRecord(userId, {
    stripeCustomerId: customer.id,
    status: "inactive",
  });

  return customer.id;
}

async function ensureStripePrices(): Promise<{
  monthlyPriceId: string;
  yearlyPriceId: string;
}> {
  const stripe = getStripe();
  const currency = getCurrency();

  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });
  const product = products.data.find(
    (p) => p.name === "Mr.\u{1F196} ProReader Subscription"
  );

  let productId = product?.id;
  if (!productId) {
    const created = await stripe.products.create({
      name: "Mr.\u{1F196} ProReader Subscription",
      description: "Full access to Mr.\u{1F196} ProReader AI features",
    });
    productId = created.id;
  }

  const monthlyAmount = Math.round(getMonthlyPrice() * 100);
  const yearlyAmount = Math.round(getYearlyPrice() * 100);

  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  const existingMonthly = existingPrices.data.find(
    (p) => p.recurring?.interval === "month"
  );
  const existingYearly = existingPrices.data.find(
    (p) => p.recurring?.interval === "year"
  );

  let monthlyPriceId: string;
  let yearlyPriceId: string;

  if (existingMonthly && existingMonthly.unit_amount === monthlyAmount) {
    monthlyPriceId = existingMonthly.id;
  } else {
    if (existingMonthly) {
      await stripe.prices.update(existingMonthly.id, { active: false });
    }
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: monthlyAmount,
      currency,
      recurring: { interval: "month" },
    });
    monthlyPriceId = price.id;
  }

  if (existingYearly && existingYearly.unit_amount === yearlyAmount) {
    yearlyPriceId = existingYearly.id;
  } else {
    if (existingYearly) {
      await stripe.prices.update(existingYearly.id, { active: false });
    }
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: yearlyAmount,
      currency,
      recurring: { interval: "year" },
    });
    yearlyPriceId = price.id;
  }

  return { monthlyPriceId, yearlyPriceId };
}

function subscriptionToRecordData(
  sub: Pick<Stripe.Subscription, "id" | "status" | "customer" | "start_date" | "trial_end" | "cancel_at_period_end">
) {
  return {
    status: sub.status as SubscriptionStatus,
    currentPeriodStart: new Date(sub.start_date * 1000).toISOString(),
    currentPeriodEnd: new Date(sub.start_date * 1000).toISOString(),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    trialEnd: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  };
}

export async function createCheckoutSession(
  userId: string,
  email: string | null,
  name: string | null,
  plan: SubscriptionPlan
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId, email, name);
  const { monthlyPriceId, yearlyPriceId } = await ensureStripePrices();
  const priceId = plan === "yearly" ? yearlyPriceId : monthlyPriceId;
  const appUrl = getAppUrl();

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 1,
      metadata: { userId },
    },
    success_url: `${appUrl}/settings?subscription=success`,
    cancel_url: `${appUrl}/settings?subscription=canceled`,
    metadata: { userId, plan },
  });

  return session.url!;
}

export async function createPortalSession(
  userId: string,
  email: string | null,
  name: string | null
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId, email, name);
  const appUrl = getAppUrl();

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings`,
  });

  return session.url!;
}

export async function cancelSubscription(userId: string): Promise<boolean> {
  const sub = await getSubscriptionRecord(userId);
  if (!sub?.stripe_subscription_id) return false;

  await getStripe().subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  await upsertSubscriptionRecord(userId, {
    stripeCustomerId: sub.stripe_customer_id,
    status: sub.status,
    cancelAtPeriodEnd: true,
  });

  return true;
}

export async function reactivateSubscription(userId: string): Promise<boolean> {
  const sub = await getSubscriptionRecord(userId);
  if (!sub?.stripe_subscription_id) return false;

  await getStripe().subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  await upsertSubscriptionRecord(userId, {
    stripeCustomerId: sub.stripe_customer_id,
    status: sub.status,
    cancelAtPeriodEnd: false,
  });

  return true;
}

export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatusResponse> {
  await ensureSubscriptionTable();
  const sub = await getSubscriptionRecord(userId);

  if (!sub) {
    return {
      hasSubscription: false,
      status: "inactive",
      plan: null,
      currentPeriodEnd: null,
      currentPeriodStart: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
    };
  }

  return {
    hasSubscription: sub.status === "active" || sub.status === "trialing",
    status: sub.status,
    plan: sub.plan,
    currentPeriodEnd: sub.current_period_end,
    currentPeriodStart: sub.current_period_start,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    trialEnd: sub.trial_end,
  };
}

export async function verifySubscriptionAccess(
  userId: string
): Promise<boolean> {
  const sub = await getSubscriptionRecord(userId);
  if (!sub) return false;
  return sub.status === "active" || sub.status === "trialing";
}

export async function getStripeCustomerIdBySubscriptionId(
  subscriptionId: string
): Promise<string | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT stripe_customer_id, user_id FROM subscriptions WHERE stripe_subscription_id = $1",
      [subscriptionId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].stripe_customer_id;
  } catch (error) {
    console.error("Failed to get stripe customer id:", error);
    return null;
  } finally {
    client.release();
  }
}

export async function getUserIdByStripeCustomerId(
  customerId: string
): Promise<string | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1 ORDER BY created_at DESC LIMIT 1",
      [customerId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].user_id;
  } catch (error) {
    console.error("Failed to get user id by stripe customer:", error);
    return null;
  } finally {
    client.release();
  }
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  await ensureSubscriptionTable();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as SubscriptionPlan | undefined;
      if (!userId || !session.subscription) return;

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const subData = subscriptionToRecordData(subscription);

      await upsertSubscriptionRecord(userId, {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        ...subData,
        plan: plan || null,
      });

      try {
        const { notifySubscriptionEvent } = await import("./subscription-email");
        await notifySubscriptionEvent(userId, "subscription_activated", {
          plan: plan || "monthly",
          status: subscription.status,
          nextBillingDate: subData.currentPeriodEnd,
          trialEndDate: subData.trialEnd || undefined,
        });
      } catch (e) {
        console.error("[webhook] Failed to send activation email:", e);
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await getUserIdByStripeCustomerId(
        subscription.customer as string
      );
      if (!userId) return;

      const prevData = event.data.previous_attributes as Record<string, unknown> | null;
      const subData = subscriptionToRecordData(subscription);
      await upsertSubscriptionRecord(userId, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        ...subData,
      });

      try {
        const { notifySubscriptionEvent } = await import("./subscription-email");
        if (prevData?.cancel_at_period_end === false && subscription.cancel_at_period_end) {
          const record = await getSubscriptionRecord(userId);
          await notifySubscriptionEvent(userId, "subscription_canceled", {
            plan: record?.plan || "monthly",
            status: subscription.status,
            nextBillingDate: subData.currentPeriodEnd,
          });
        }
        if (prevData?.cancel_at_period_end === true && !subscription.cancel_at_period_end) {
          const record = await getSubscriptionRecord(userId);
          await notifySubscriptionEvent(userId, "subscription_renewed", {
            plan: record?.plan || "monthly",
            status: subscription.status,
            nextBillingDate: subData.currentPeriodEnd,
          });
        }
      } catch (e) {
        console.error("[webhook] Failed to send update email:", e);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await getUserIdByStripeCustomerId(
        subscription.customer as string
      );
      if (!userId) return;

      const subData = subscriptionToRecordData(subscription);
      await upsertSubscriptionRecord(userId, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        ...subData,
        status: "canceled",
        cancelAtPeriodEnd: false,
      });
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (!subscriptionId) return;
      if (invoice.billing_reason === "subscription_create") return;

      const subId = typeof subscriptionId === "string"
        ? subscriptionId
        : subscriptionId.id;

      const subscription = await getStripe().subscriptions.retrieve(subId);
      const userId = await getUserIdByStripeCustomerId(
        subscription.customer as string
      );
      if (!userId) return;

      const subData = subscriptionToRecordData(subscription);
      await upsertSubscriptionRecord(userId, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        ...subData,
      });

      if (invoice.billing_reason === "subscription_cycle") {
        try {
          const { notifySubscriptionEvent } = await import("./subscription-email");
          const record = await getSubscriptionRecord(userId);
          await notifySubscriptionEvent(userId, "subscription_renewed", {
            plan: record?.plan || "monthly",
            status: subscription.status,
            nextBillingDate: subData.currentPeriodEnd,
          });
        } catch (e) {
          console.error("[webhook] Failed to send renewal email:", e);
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (!subscriptionId) return;

      const subId = typeof subscriptionId === "string"
        ? subscriptionId
        : subscriptionId.id;

      const subscription = await getStripe().subscriptions.retrieve(subId);
      const userId = await getUserIdByStripeCustomerId(
        subscription.customer as string
      );
      if (!userId) return;

      const subData = subscriptionToRecordData(subscription);
      await upsertSubscriptionRecord(userId, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        ...subData,
        status: "past_due",
      });

      try {
        const { notifySubscriptionEvent } = await import("./subscription-email");
        const record = await getSubscriptionRecord(userId);
        await notifySubscriptionEvent(userId, "payment_failed", {
          plan: record?.plan || "monthly",
          status: "past_due",
          nextBillingDate: subData.currentPeriodEnd,
        });
      } catch (e) {
        console.error("[webhook] Failed to send payment failed email:", e);
      }
      break;
    }
  }
}

export function getPricingInfo() {
  return {
    monthly: {
      amount: getMonthlyPrice(),
      currency: getCurrency(),
    },
    yearly: {
      amount: getYearlyPrice(),
      currency: getCurrency(),
    },
  };
}
