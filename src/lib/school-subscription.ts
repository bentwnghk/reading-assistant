import Stripe from "stripe";
import { getClient } from "./db";
import { getSchoolForUser, ensureSchoolAccessEndsAtColumn } from "./users";
import {
  ensureSchoolStripePrices,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type SubscriptionEventType,
  getStripe,
  getAppUrl,
} from "./subscription";

export interface SchoolSubscriptionRecord {
  id: string;
  school_id: string;
  admin_user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  quantity: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolSubscriptionEvent {
  id: string;
  school_id: string;
  stripe_subscription_id: string | null;
  event_type: SubscriptionEventType;
  status: SubscriptionStatus | null;
  plan: SubscriptionPlan | null;
  quantity: number | null;
  period_start: string | null;
  period_end: string | null;
  trial_end: string | null;
  event_time: string;
}

export interface SchoolSubscriptionStatusResponse {
  hasSubscription: boolean;
  subscriptionId: string | null;
  schoolName: string | null;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  quantity: number;
  seatsUsed: number;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  trialEligible: boolean;
}

export const MIN_SEAT_QUANTITY = 20;

let schoolTableEnsured = false;

export async function ensureSchoolSubscriptionTables(): Promise<boolean> {
  if (schoolTableEnsured) return true;
  const client = await getClient();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_subscriptions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        admin_user_id TEXT NOT NULL REFERENCES users(id),
        stripe_customer_id TEXT NOT NULL,
        stripe_subscription_id TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'inactive'
          CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused', 'inactive')),
        plan TEXT CHECK (plan IN ('monthly', 'yearly')),
        quantity INTEGER NOT NULL DEFAULT ${MIN_SEAT_QUANTITY},
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT false,
        trial_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    // Migrate existing deployments: ensure 'inactive' is in the status check constraint.
    // The original constraint omitted 'inactive', causing INSERT failures during checkout init.
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE school_subscriptions
          DROP CONSTRAINT IF EXISTS school_subscriptions_status_check;
        EXCEPTION WHEN OTHERS THEN NULL;
      END $$
    `);
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE school_subscriptions
          ADD CONSTRAINT school_subscriptions_status_check
            CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused', 'inactive'));
        EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_subscriptions_school_id ON school_subscriptions(school_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_subscriptions_admin_user_id ON school_subscriptions(admin_user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_subscriptions_stripe_customer ON school_subscriptions(stripe_customer_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS school_subscription_usage (
        school_subscription_id TEXT NOT NULL REFERENCES school_subscriptions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        first_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (school_subscription_id, user_id, billing_period_start)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_subscription_usage_user ON school_subscription_usage(user_id)
    `);

    await ensureSchoolSubscriptionEventsTable(client);
    schoolTableEnsured = true;
    return true;
  } catch (error) {
    console.error("Failed to ensure school subscription tables:", error);
    return false;
  } finally {
    client.release();
  }
}

let schoolEventsTableEnsured = false;

async function ensureSchoolSubscriptionEventsTable(
  existingClient?: import("pg").PoolClient
): Promise<void> {
  if (schoolEventsTableEnsured) return;
  const run = async (client: import("pg").PoolClient) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_subscription_events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        stripe_subscription_id TEXT,
        event_type TEXT NOT NULL,
        status TEXT,
        plan TEXT,
        quantity INTEGER,
        period_start TIMESTAMP WITH TIME ZONE,
        period_end TIMESTAMP WITH TIME ZONE,
        trial_end TIMESTAMP WITH TIME ZONE,
        event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_subscription_events_school_time
        ON school_subscription_events(school_id, event_time DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_subscription_events_sub_time
        ON school_subscription_events(stripe_subscription_id, event_time DESC)
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'school_subscription_events_dedup_key'
             AND conrelid = 'school_subscription_events'::regclass
        ) THEN
          ALTER TABLE school_subscription_events
            ADD CONSTRAINT school_subscription_events_dedup_key
              UNIQUE (stripe_subscription_id, event_type, period_start);
        END IF;
      END $$
    `);
  };

  if (existingClient) {
    await run(existingClient);
  } else {
    const client = await getClient();
    try {
      await run(client);
    } finally {
      client.release();
    }
  }
  schoolEventsTableEnsured = true;
}

async function recordSchoolSubscriptionEvent(
  schoolId: string,
  data: {
    stripeSubscriptionId?: string | null;
    eventType: SubscriptionEventType;
    status?: SubscriptionStatus | null;
    plan?: SubscriptionPlan | null;
    quantity?: number | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    trialEnd?: string | null;
  }
): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO school_subscription_events
        (school_id, stripe_subscription_id, event_type, status, plan, quantity,
         period_start, period_end, trial_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (stripe_subscription_id, event_type, period_start) DO NOTHING`,
      [
        schoolId,
        data.stripeSubscriptionId ?? null,
        data.eventType,
        data.status ?? null,
        data.plan ?? null,
        data.quantity ?? null,
        data.periodStart ?? null,
        data.periodEnd ?? null,
        data.trialEnd ?? null,
      ]
    );
  } catch (error) {
    console.error("Failed to record school subscription event:", error);
  } finally {
    client.release();
  }
}

export async function getSchoolSubscriptionEvents(
  schoolId: string
): Promise<SchoolSubscriptionEvent[]> {
  await ensureSchoolSubscriptionTables();
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT * FROM school_subscription_events
       WHERE school_id = $1
       ORDER BY event_time DESC`,
      [schoolId]
    );
    return result.rows as SchoolSubscriptionEvent[];
  } catch (error) {
    console.error("Failed to get school subscription events:", error);
    return [];
  } finally {
    client.release();
  }
}

async function getSchoolSubscriptionRecord(
  schoolId: string
): Promise<SchoolSubscriptionRecord | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT * FROM school_subscriptions WHERE school_id = $1 ORDER BY created_at DESC LIMIT 1",
      [schoolId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as SchoolSubscriptionRecord;
  } catch (error) {
    console.error("Failed to get school subscription:", error);
    return null;
  } finally {
    client.release();
  }
}

export async function hasHadSchoolTrial(schoolId: string): Promise<boolean> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT 1 FROM school_subscriptions WHERE school_id = $1 AND trial_end IS NOT NULL LIMIT 1",
      [schoolId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Failed to check school trial history:", error);
    return false;
  } finally {
    client.release();
  }
}

async function upsertSchoolSubscriptionRecord(
  schoolId: string,
  adminUserId: string,
  data: {
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
    status: SubscriptionStatus;
    plan?: SubscriptionPlan | null;
    quantity?: number;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: string | null;
  }
): Promise<SchoolSubscriptionRecord | null> {
  const client = await getClient();
  try {
    const existing = await getSchoolSubscriptionRecord(schoolId);
    if (existing) {
      const result = await client.query(
        `UPDATE school_subscriptions SET
          stripe_customer_id = $1,
          stripe_subscription_id = $2,
          status = $3,
          plan = $4,
          quantity = $5,
          current_period_start = $6,
          current_period_end = $7,
          cancel_at_period_end = $8,
          trial_end = $9,
          updated_at = NOW()
        WHERE school_id = $10
        RETURNING *`,
        [
          data.stripeCustomerId,
          data.stripeSubscriptionId ?? existing.stripe_subscription_id,
          data.status,
          data.plan ?? existing.plan,
          data.quantity ?? existing.quantity,
          data.currentPeriodStart ?? existing.current_period_start,
          data.currentPeriodEnd ?? existing.current_period_end,
          data.cancelAtPeriodEnd ?? existing.cancel_at_period_end,
          data.trialEnd ?? existing.trial_end,
          schoolId,
        ]
      );
      return result.rows[0] as SchoolSubscriptionRecord;
    } else {
      const result = await client.query(
        `INSERT INTO school_subscriptions (
          school_id, admin_user_id, stripe_customer_id, stripe_subscription_id,
          status, plan, quantity, current_period_start, current_period_end,
          cancel_at_period_end, trial_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          schoolId,
          adminUserId,
          data.stripeCustomerId,
          data.stripeSubscriptionId ?? null,
          data.status,
          data.plan ?? null,
          data.quantity ?? MIN_SEAT_QUANTITY,
          data.currentPeriodStart ?? null,
          data.currentPeriodEnd ?? null,
          data.cancelAtPeriodEnd ?? false,
          data.trialEnd ?? null,
        ]
      );
      return result.rows[0] as SchoolSubscriptionRecord;
    }
  } catch (error) {
    console.error("Failed to upsert school subscription:", error);
    return null;
  } finally {
    client.release();
  }
}

async function getOrCreateSchoolStripeCustomer(
  schoolId: string,
  adminUserId: string,
  email: string | null,
  name: string | null
): Promise<string> {
  const existing = await getSchoolSubscriptionRecord(schoolId);
  if (existing?.stripe_customer_id) {
    // Verify the customer exists in the current Stripe mode (test vs live).
    // A stored customer ID from the opposite mode causes "No such customer" errors.
    try {
      const customer = await getStripe().customers.retrieve(
        existing.stripe_customer_id
      );
      if (!(customer as { deleted?: boolean }).deleted) {
        return existing.stripe_customer_id;
      }
    } catch {
      // Customer not found in current Stripe mode — fall through to create a new one.
    }
  }

  const customer = await getStripe().customers.create({
    email: email || undefined,
    name: name || undefined,
    metadata: { schoolId, adminUserId, type: "school" },
  });

  await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
    stripeCustomerId: customer.id,
    status: "inactive",
  });

  return customer.id;
}

async function getSeatsUsed(
  schoolSubscriptionId: string,
  periodStart: string
): Promise<number> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT COUNT(*)::int as count FROM school_subscription_usage WHERE school_subscription_id = $1 AND billing_period_start = $2",
      [schoolSubscriptionId, periodStart]
    );
    return result.rows[0].count;
  } catch (error) {
    console.error("Failed to get seats used:", error);
    return 0;
  } finally {
    client.release();
  }
}

function subscriptionToRecordData(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    status: sub.status as SubscriptionStatus,
    quantity: item?.quantity ?? MIN_SEAT_QUANTITY,
    currentPeriodStart: item
      ? new Date(item.current_period_start * 1000).toISOString()
      : new Date(sub.start_date * 1000).toISOString(),
    currentPeriodEnd: item
      ? new Date(item.current_period_end * 1000).toISOString()
      : new Date(sub.start_date * 1000).toISOString(),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    trialEnd: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  };
}

function getPlanFromSubscription(sub: Stripe.Subscription): SubscriptionPlan | null {
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  if (interval === "month") return "monthly";
  if (interval === "year") return "yearly";
  return null;
}

export async function getSchoolSubscriptionStatus(
  schoolId: string
): Promise<SchoolSubscriptionStatusResponse> {
  await ensureSchoolSubscriptionTables();

  const previouslyTrialed = await hasHadSchoolTrial(schoolId);

  const client = await getClient();
  try {
    const schoolResult = await client.query(
      "SELECT name FROM schools WHERE id = $1",
      [schoolId]
    );
    const schoolName = schoolResult.rows.length > 0 ? schoolResult.rows[0].name : null;

    const sub = await getSchoolSubscriptionRecord(schoolId);

    if (!sub || sub.status === "inactive") {
      return {
        hasSubscription: false,
        subscriptionId: null,
        schoolName,
        status: "inactive",
        plan: null,
        quantity: MIN_SEAT_QUANTITY,
        seatsUsed: 0,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        trialEligible: !previouslyTrialed,
      };
    }

    const seatsUsed = sub.current_period_start
      ? await getSeatsUsed(sub.id, sub.current_period_start)
      : 0;

    return {
      hasSubscription: sub.status === "active" || sub.status === "trialing",
      subscriptionId: sub.id,
      schoolName,
      status: sub.status,
      plan: sub.plan,
      quantity: sub.quantity,
      seatsUsed,
      currentPeriodEnd: sub.current_period_end,
      currentPeriodStart: sub.current_period_start,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEnd: sub.trial_end,
      trialEligible: !previouslyTrialed,
    };
  } catch (error) {
    console.error("Failed to get school subscription status:", error);
    return {
      hasSubscription: false,
      subscriptionId: null,
      schoolName: null,
      status: "inactive",
      plan: null,
      quantity: MIN_SEAT_QUANTITY,
      seatsUsed: 0,
      currentPeriodEnd: null,
      currentPeriodStart: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      trialEligible: !previouslyTrialed,
    };
  } finally {
    client.release();
  }
}

export async function getSchoolSubscriptionForUser(
  userId: string
): Promise<SchoolSubscriptionStatusResponse | null> {
  await ensureSchoolSubscriptionTables();
  const schoolId = await getSchoolForUser(userId);
  if (!schoolId) return null;
  return getSchoolSubscriptionStatus(schoolId);
}

export async function verifySchoolSubscriptionAccess(
  userId: string
): Promise<boolean> {
  await ensureSchoolSubscriptionTables();
  await ensureSchoolAccessEndsAtColumn();
  const schoolId = await getSchoolForUser(userId);
  if (!schoolId) return false;

  const client = await getClient();
  try {
    const accessResult = await client.query(
      `SELECT school_access_ends_at FROM users WHERE id = $1`,
      [userId]
    );
    const accessEndsAt = accessResult.rows[0]?.school_access_ends_at;
    if (accessEndsAt && new Date(accessEndsAt) < new Date()) {
      return false;
    }
  } finally {
    client.release();
  }

  const sub = await getSchoolSubscriptionRecord(schoolId);
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (!sub.current_period_start) return false;

  const seatsUsed = await getSeatsUsed(sub.id, sub.current_period_start);
  return seatsUsed < sub.quantity;
}

export async function recordSeatUsage(
  userId: string,
  schoolId: string
): Promise<void> {
  await ensureSchoolSubscriptionTables();
  const sub = await getSchoolSubscriptionRecord(schoolId);
  if (!sub || !sub.current_period_start) return;

  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO school_subscription_usage (school_subscription_id, user_id, billing_period_start)
       VALUES ($1, $2, $3)
       ON CONFLICT (school_subscription_id, user_id, billing_period_start) DO NOTHING`,
      [sub.id, userId, sub.current_period_start]
    );
  } catch (error) {
    console.error("Failed to record seat usage:", error);
  } finally {
    client.release();
  }
}

export async function createSchoolCheckoutSession(
  adminUserId: string,
  schoolId: string,
  email: string | null,
  name: string | null,
  plan: SubscriptionPlan,
  quantity: number
): Promise<string> {
  if (quantity < MIN_SEAT_QUANTITY) {
    throw new Error(`Minimum seat quantity is ${MIN_SEAT_QUANTITY}`);
  }

  const customerId = await getOrCreateSchoolStripeCustomer(schoolId, adminUserId, email, name);
  const { monthlyPriceId, yearlyPriceId } = await ensureSchoolStripePrices();
  const priceId = plan === "yearly" ? yearlyPriceId : monthlyPriceId;
  const appUrl = getAppUrl();
  const previouslyTrialed = await hasHadSchoolTrial(schoolId);
  const trialDays = previouslyTrialed ? undefined : parseInt(process.env.SCHOOL_SUBSCRIPTION_TRIAL_PERIOD_DAYS || "1", 10) || undefined;

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity }],
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata: { schoolId, adminUserId, type: "school", plan },
    },
    success_url: `${appUrl}/?school_subscription=success`,
    cancel_url: `${appUrl}/?school_subscription=canceled`,
    metadata: { schoolId, adminUserId, type: "school", plan },
  });

  return session.url!;
}

export async function createSchoolPortalSession(
  adminUserId: string,
  schoolId: string,
  email: string | null,
  name: string | null
): Promise<string> {
  const customerId = await getOrCreateSchoolStripeCustomer(schoolId, adminUserId, email, name);
  const appUrl = getAppUrl();

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/`,
  });

  return session.url!;
}

export async function cancelSchoolSubscription(
  adminUserId: string,
  schoolId: string
): Promise<boolean> {
  const sub = await getSchoolSubscriptionRecord(schoolId);
  if (!sub?.stripe_subscription_id) return false;

  await getStripe().subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
    stripeCustomerId: sub.stripe_customer_id,
    status: sub.status,
    cancelAtPeriodEnd: true,
  });

  return true;
}

export async function reactivateSchoolSubscription(
  adminUserId: string,
  schoolId: string
): Promise<boolean> {
  const sub = await getSchoolSubscriptionRecord(schoolId);
  if (!sub?.stripe_subscription_id) return false;

  await getStripe().subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
    stripeCustomerId: sub.stripe_customer_id,
    status: sub.status,
    cancelAtPeriodEnd: false,
  });

  return true;
}

export async function switchSchoolSubscriptionPlan(
  adminUserId: string,
  schoolId: string,
  newPlan: SubscriptionPlan
): Promise<boolean> {
  const sub = await getSchoolSubscriptionRecord(schoolId);
  if (!sub?.stripe_subscription_id) return false;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return false;
  }

  const item = subscription.items.data[0];
  if (!item) return false;

  const { monthlyPriceId, yearlyPriceId } = await ensureSchoolStripePrices();
  const newPriceId = newPlan === "yearly" ? yearlyPriceId : monthlyPriceId;

  if (item.price.id === newPriceId) return true;

  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [{ id: item.id, price: newPriceId }],
    proration_behavior: "create_prorations",
  });

  const subData = subscriptionToRecordData(updated);
  await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
    stripeCustomerId: sub.stripe_customer_id,
    stripeSubscriptionId: sub.stripe_subscription_id,
    ...subData,
    plan: newPlan,
  });

  return true;
}

export async function updateSchoolSubscriptionQuantity(
  adminUserId: string,
  schoolId: string,
  newQuantity: number
): Promise<boolean> {
  if (newQuantity < MIN_SEAT_QUANTITY) {
    throw new Error(`Minimum seat quantity is ${MIN_SEAT_QUANTITY}`);
  }

  const sub = await getSchoolSubscriptionRecord(schoolId);
  if (!sub?.stripe_subscription_id) return false;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return false;
  }

  const item = subscription.items.data[0];
  if (!item) return false;

  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [{ id: item.id, quantity: newQuantity }],
    proration_behavior: "create_prorations",
  });

  const subData = subscriptionToRecordData(updated);
  await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
    stripeCustomerId: sub.stripe_customer_id,
    stripeSubscriptionId: sub.stripe_subscription_id,
    ...subData,
    quantity: newQuantity,
  });

  return true;
}

export async function getStripeCustomerIdBySchoolSubscriptionId(
  subscriptionId: string
): Promise<{ stripeCustomerId: string; schoolId: string } | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT stripe_customer_id, school_id FROM school_subscriptions WHERE stripe_subscription_id = $1",
      [subscriptionId]
    );
    if (result.rows.length === 0) return null;
    return {
      stripeCustomerId: result.rows[0].stripe_customer_id,
      schoolId: result.rows[0].school_id,
    };
  } catch (error) {
    console.error("Failed to get school subscription by stripe id:", error);
    return null;
  } finally {
    client.release();
  }
}

export async function getSchoolIdByStripeCustomerId(
  customerId: string
): Promise<string | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT school_id FROM school_subscriptions WHERE stripe_customer_id = $1 ORDER BY created_at DESC LIMIT 1",
      [customerId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].school_id;
  } catch (error) {
    console.error("Failed to get school id by stripe customer:", error);
    return null;
  } finally {
    client.release();
  }
}

export async function handleSchoolWebhookEvent(event: Stripe.Event): Promise<void> {
  await ensureSchoolSubscriptionTables();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type !== "school") return;

      const schoolId = session.metadata?.schoolId;
      const adminUserId = session.metadata?.adminUserId;
      const plan = session.metadata?.plan as SubscriptionPlan | undefined;
      if (!schoolId || !adminUserId || !session.subscription) return;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const subData = subscriptionToRecordData(subscription);

      await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        ...subData,
        plan: plan || null,
        quantity: subData.quantity,
      });

      await recordSchoolSubscriptionEvent(schoolId, {
        stripeSubscriptionId: subscription.id,
        eventType: "started",
        status: subData.status,
        plan: plan || null,
        quantity: subData.quantity,
        periodStart: subData.currentPeriodStart,
        periodEnd: subData.currentPeriodEnd,
        trialEnd: subData.trialEnd,
      });

      // The admin always consumes one seat — record their usage at activation time.
      await recordSeatUsage(adminUserId, schoolId).catch(() => {});

      try {
        const { notifySubscriptionEvent, getSchoolContext } = await import("./subscription-email");
        const schoolCtx = await getSchoolContext(schoolId);
        await notifySubscriptionEvent(adminUserId, "subscription_activated", {
          plan: plan || "monthly",
          status: subscription.status,
          nextBillingDate: subData.currentPeriodEnd,
          trialEndDate: subData.trialEnd || undefined,
          schoolContext: schoolCtx || undefined,
        });
      } catch (e) {
        console.error("[webhook] Failed to send school activation email:", e);
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const lookup = await getStripeCustomerIdBySchoolSubscriptionId(subscription.id);
      if (!lookup) return;

      const { schoolId, stripeCustomerId } = lookup;

      const client = await getClient();
      let adminUserId: string | null = null;
      try {
        const result = await client.query(
          "SELECT admin_user_id FROM school_subscriptions WHERE school_id = $1",
          [schoolId]
        );
        if (result.rows.length > 0) {
          adminUserId = result.rows[0].admin_user_id;
        }
      } finally {
        client.release();
      }

      if (!adminUserId) return;

      const prevData = event.data.previous_attributes as Record<string, unknown> | null;
      const subData = subscriptionToRecordData(subscription);
      const detectedPlan = getPlanFromSubscription(subscription);
      await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        ...subData,
        ...(detectedPlan ? { plan: detectedPlan } : {}),
      });

      if (prevData?.cancel_at_period_end === false && subscription.cancel_at_period_end) {
        await recordSchoolSubscriptionEvent(schoolId, {
          stripeSubscriptionId: subscription.id,
          eventType: "cancel_scheduled",
          status: subData.status,
          plan: detectedPlan ?? null,
          quantity: subData.quantity,
          periodStart: subData.currentPeriodStart,
          periodEnd: subData.currentPeriodEnd,
        });
      }
      if (prevData?.cancel_at_period_end === true && !subscription.cancel_at_period_end) {
        await recordSchoolSubscriptionEvent(schoolId, {
          stripeSubscriptionId: subscription.id,
          eventType: "reactivated",
          status: subData.status,
          plan: detectedPlan ?? null,
          quantity: subData.quantity,
          periodStart: subData.currentPeriodStart,
          periodEnd: subData.currentPeriodEnd,
        });
      }

      try {
        const { notifySubscriptionEvent, getSchoolContext } = await import("./subscription-email");
        const schoolCtx = await getSchoolContext(schoolId);
        if (prevData?.cancel_at_period_end === false && subscription.cancel_at_period_end) {
          const record = await getSchoolSubscriptionRecord(schoolId);
          await notifySubscriptionEvent(adminUserId, "subscription_canceled", {
            plan: record?.plan || "monthly",
            status: subscription.status,
            nextBillingDate: subData.currentPeriodEnd,
            schoolContext: schoolCtx || undefined,
          });
        }
        if (prevData?.cancel_at_period_end === true && !subscription.cancel_at_period_end) {
          const record = await getSchoolSubscriptionRecord(schoolId);
          await notifySubscriptionEvent(adminUserId, "subscription_renewed", {
            plan: record?.plan || "monthly",
            status: subscription.status,
            nextBillingDate: subData.currentPeriodEnd,
            schoolContext: schoolCtx || undefined,
          });
        }
      } catch (e) {
        console.error("[webhook] Failed to send school update email:", e);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const lookup = await getStripeCustomerIdBySchoolSubscriptionId(subscription.id);
      if (!lookup) return;

      const { schoolId, stripeCustomerId } = lookup;

      const client = await getClient();
      let adminUserId: string | null = null;
      try {
        const result = await client.query(
          "SELECT admin_user_id FROM school_subscriptions WHERE school_id = $1",
          [schoolId]
        );
        if (result.rows.length > 0) {
          adminUserId = result.rows[0].admin_user_id;
        }
      } finally {
        client.release();
      }

      if (!adminUserId) return;

      const subData = subscriptionToRecordData(subscription);
      await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        ...subData,
        status: "canceled",
        cancelAtPeriodEnd: false,
      });

      await recordSchoolSubscriptionEvent(schoolId, {
        stripeSubscriptionId: subscription.id,
        eventType: "canceled",
        status: "canceled",
        quantity: subData.quantity,
        periodStart: subData.currentPeriodStart,
        periodEnd: subData.currentPeriodEnd,
      });
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (!subscriptionId) return;
      if (invoice.billing_reason === "subscription_create") return;

      const subId =
        typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;

      const lookup = await getStripeCustomerIdBySchoolSubscriptionId(subId);
      if (!lookup) return;

      const { schoolId, stripeCustomerId } = lookup;

      const client = await getClient();
      let adminUserId: string | null = null;
      try {
        const result = await client.query(
          "SELECT admin_user_id FROM school_subscriptions WHERE school_id = $1",
          [schoolId]
        );
        if (result.rows.length > 0) {
          adminUserId = result.rows[0].admin_user_id;
        }
      } finally {
        client.release();
      }

      if (!adminUserId) return;

      const subscription = await getStripe().subscriptions.retrieve(subId);
      const subData = subscriptionToRecordData(subscription);
      await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        ...subData,
      });

      if (invoice.billing_reason === "subscription_cycle") {
        await recordSchoolSubscriptionEvent(schoolId, {
          stripeSubscriptionId: subscription.id,
          eventType: "renewed",
          status: subData.status,
          plan: getPlanFromSubscription(subscription),
          quantity: subData.quantity,
          periodStart: subData.currentPeriodStart,
          periodEnd: subData.currentPeriodEnd,
        });
        try {
          const { notifySubscriptionEvent, notifyPaymentReceipt, getSchoolContext } = await import("./subscription-email");
          const record = await getSchoolSubscriptionRecord(schoolId);
          const schoolCtx = await getSchoolContext(schoolId);
          const schoolOpts = schoolCtx ? { schoolContext: schoolCtx } : {};
          await notifySubscriptionEvent(adminUserId, "subscription_renewed", {
            plan: record?.plan || "monthly",
            status: subscription.status,
            nextBillingDate: subData.currentPeriodEnd,
            ...schoolOpts,
          });
          await notifyPaymentReceipt(adminUserId, {
            plan: record?.plan || "monthly",
            status: subscription.status,
            nextBillingDate: subData.currentPeriodEnd,
            invoiceId: invoice.id,
            invoiceUrl: invoice.hosted_invoice_url || undefined,
            invoiceAmount: (invoice.total / 100).toLocaleString(invoice.currency || "usd", {
              style: "currency",
              currency: invoice.currency || "usd",
            }),
            invoiceDate: new Date(invoice.created * 1000).toISOString(),
            invoiceNumber: invoice.number || undefined,
            ...schoolOpts,
          });
        } catch (e) {
          console.error("[webhook] Failed to send school renewal/receipt email:", e);
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (!subscriptionId) return;

      const subId =
        typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;

      const lookup = await getStripeCustomerIdBySchoolSubscriptionId(subId);
      if (!lookup) return;

      const { schoolId, stripeCustomerId } = lookup;

      const client = await getClient();
      let adminUserId: string | null = null;
      try {
        const result = await client.query(
          "SELECT admin_user_id FROM school_subscriptions WHERE school_id = $1",
          [schoolId]
        );
        if (result.rows.length > 0) {
          adminUserId = result.rows[0].admin_user_id;
        }
      } finally {
        client.release();
      }

      if (!adminUserId) return;

      const subscription = await getStripe().subscriptions.retrieve(subId);
      const subData = subscriptionToRecordData(subscription);
      await upsertSchoolSubscriptionRecord(schoolId, adminUserId, {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        ...subData,
        status: "past_due",
      });

      await recordSchoolSubscriptionEvent(schoolId, {
        stripeSubscriptionId: subscription.id,
        eventType: "past_due",
        status: "past_due",
        quantity: subData.quantity,
        periodStart: subData.currentPeriodStart,
        periodEnd: subData.currentPeriodEnd,
      });

      try {
        const { notifySubscriptionEvent, getSchoolContext } = await import("./subscription-email");
        const record = await getSchoolSubscriptionRecord(schoolId);
        const schoolCtx = await getSchoolContext(schoolId);
        await notifySubscriptionEvent(adminUserId, "payment_failed", {
          plan: record?.plan || "monthly",
          status: "past_due",
          nextBillingDate: subData.currentPeriodEnd,
          schoolContext: schoolCtx || undefined,
        });
      } catch (e) {
        console.error("[webhook] Failed to send school payment failed email:", e);
      }
      break;
    }
  }
}
