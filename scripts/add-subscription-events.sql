-- ─── Subscription events (history) tables ─────────────────────────────────────
-- Run this migration on an existing database to add append-only subscription
-- history tracking. Records one row per meaningful lifecycle event so admins can
-- see how long a user/school has been subscribing.
-- Usage: psql -d reading_assistant -f scripts/add-subscription-events.sql

-- Personal subscription events ------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT,
  plan TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_time
  ON subscription_events(user_id, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_events_sub_time
  ON subscription_events(stripe_subscription_id, event_time DESC);

-- Dedup: a given (subscription, event_type, billing period) is recorded once.
-- NULLS NOT DISTINCT (PostgreSQL 15+) treats NULL period_start as equal so
-- events without a period (e.g. final cancel) still dedupe correctly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_events_dedup_key'
       AND conrelid = 'subscription_events'::regclass
  ) THEN
    ALTER TABLE subscription_events
      ADD CONSTRAINT subscription_events_dedup_key
        UNIQUE (stripe_subscription_id, event_type, period_start) NULLS NOT DISTINCT;
  END IF;
END $$;

-- School subscription events --------------------------------------------------

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
);

CREATE INDEX IF NOT EXISTS idx_school_subscription_events_school_time
  ON school_subscription_events(school_id, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_school_subscription_events_sub_time
  ON school_subscription_events(stripe_subscription_id, event_time DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'school_subscription_events_dedup_key'
       AND conrelid = 'school_subscription_events'::regclass
  ) THEN
    ALTER TABLE school_subscription_events
      ADD CONSTRAINT school_subscription_events_dedup_key
        UNIQUE (stripe_subscription_id, event_type, period_start) NULLS NOT DISTINCT;
  END IF;
END $$;

-- Backfill: seed a baseline "started" event from the current snapshot so the
-- "subscribed since" date is populated for existing subscribers. Intermediate
-- renewal periods before this migration are not recoverable (the snapshot table
-- only retains the current period). ON CONFLICT keeps this safe to re-run.
INSERT INTO subscription_events
  (user_id, stripe_subscription_id, event_type, status, plan,
   period_start, period_end, trial_end, event_time)
SELECT user_id, stripe_subscription_id, 'started', status, plan,
       current_period_start, current_period_end, trial_end, created_at
FROM subscriptions
WHERE stripe_subscription_id IS NOT NULL
ON CONFLICT (stripe_subscription_id, event_type, period_start) DO NOTHING;

INSERT INTO school_subscription_events
  (school_id, stripe_subscription_id, event_type, status, plan, quantity,
   period_start, period_end, trial_end, event_time)
SELECT school_id, stripe_subscription_id, 'started', status, plan, quantity,
       current_period_start, current_period_end, trial_end, created_at
FROM school_subscriptions
WHERE stripe_subscription_id IS NOT NULL
ON CONFLICT (stripe_subscription_id, event_type, period_start) DO NOTHING;
