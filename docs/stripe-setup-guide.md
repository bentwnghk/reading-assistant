# Stripe Dashboard Setup Guide

This guide walks you through configuring Stripe for the Reading Assistant subscription system.

## Prerequisites

- A Stripe account ([sign up free](https://stripe.com))
- Access to your server's `docker-compose.yml` or `.env` file
- Your app's public URL (e.g. `https://read.mr5ai.com`)

## Step 1: Get Your API Keys

1. Go to [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Toggle **"Test mode"** if you want to test first (recommended)
3. Copy the **Secret key** (starts with `sk_test_...` or `sk_live_...`)
4. Copy the **Publishable key** (starts with `pk_test_...` or `pk_live_...`)

Add them to your `docker-compose.yml` environment:

```yaml
STRIPE_SECRET_KEY: "sk_test_..."
STRIPE_PUBLISHABLE_KEY: "pk_test_..."
```

## Step 2: Configure the Webhook

1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set the endpoint URL to: `https://your-domain.com/api/webhooks/stripe`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Click **"Reveal"** next to **"Signing secret"** and copy it

Add the signing secret to your environment:

```yaml
STRIPE_WEBHOOK_SECRET: "whsec_..."
```

## Step 3: Configure Customer Portal

1. Go to [https://dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the **"Customer portal"**
3. Configure the following features:
   - **Payment methods** — allow customers to update their payment method
   - **Subscriptions** — allow customers to cancel, reactivate, and **switch plans** (monthly ↔ yearly)
   - **Invoices** — allow customers to view and download invoices
4. Set a **Return URL** to your home page: `https://your-domain.com/`
5. Customize the branding (logo, colors) to match your app

## Step 4: Set Your Pricing

The pricing is configured via environment variables. Set them in `docker-compose.yml`:

```yaml
SUBSCRIPTION_MONTHLY_PRICE: "9.99"
SUBSCRIPTION_CURRENCY: "usd"
```

The yearly price is automatically calculated as `monthly_price * 10` (save 2 months).

The product ("Mr.🆖 ProReader Subscription") and Stripe prices are created automatically on the first checkout request. If you change `SUBSCRIPTION_MONTHLY_PRICE`, old prices are deactivated and new ones are created automatically.

## Step 5: Configure a Separate API Key for Subscribers

To isolate subscription-based AI usage from EDU mode, set a separate API key:

```yaml
OPENAI_COMPATIBLE_SUBSCRIPTION_API_KEY: "sk-..."
```

This key is used exclusively for requests from authenticated subscribers.

## Step 6: (Optional) Enable Live Mode

Once you've tested everything in test mode:

1. Go to [https://dashboard.stripe.com/account](https://dashboard.stripe.com/account)
2. Complete the Stripe onboarding (business details, bank account for payouts)
3. Toggle **"Test mode" OFF** in the Stripe dashboard
4. Repeat **Step 1** to copy your **live** API keys
5. Repeat **Step 2** to create a **live** webhook endpoint
6. Update your environment variables with the live keys

## Testing with Stripe Test Mode

Use these test card numbers in the Stripe Checkout:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment is declined |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0027 6000 3184` | 3D Secure authentication fails |

For all test cards, use:
- Expiry: any future date (e.g. `12/34`)
- CVC: any 3 digits (e.g. `123`)
- Name: any name
- Country/ZIP: any valid values

The 1-day free trial is active, so the first charge will occur after the trial ends.

### Webhook Testing with Stripe CLI

For local development, use the Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will display the `whsec_...` signing secret to use as `STRIPE_WEBHOOK_SECRET`.

### Triggering Test Webhooks

Use the Stripe CLI to trigger specific webhook events for testing:

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## Verifying Your Setup

After completing the above steps, verify your integration:

1. Sign in to your app with Google OAuth
2. Open Settings, switch to "Subscription" mode
3. Click "Subscribe" on the monthly or yearly plan
4. Complete the Stripe Checkout with test card `4242 4242 4242 4242`
5. You should be redirected to `/?subscription=success` with a success toast
6. Your subscription status should show as "Trial" with the correct plan
7. Click "Manage Subscription" to verify the customer portal works
8. Test cancellation and reactivation flows

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook returns 400 | Check `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint's signing secret |
| Checkout returns "Webhook not configured" | Set `STRIPE_WEBHOOK_SECRET` in your environment |
| Subscription shows "inactive" after payment | Verify webhooks are reaching your server (check Stripe Dashboard > Webhooks > Events) |
| Customer portal returns error | Ensure the portal is enabled in Stripe Dashboard > Settings > Billing |
| Price mismatch | Check `SUBSCRIPTION_MONTHLY_PRICE` — changes auto-sync on next checkout |
