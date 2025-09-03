# Stripe Integration Setup Guide

This guide will help you set up Stripe recurring payments for your NuSong app.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your NuSong app running with admin access
3. Database access to run migrations

## Step 1: Database Migration

First, run the migration to add Stripe fields to your database:

```bash
node scripts/migrate-stripe-fields.js
```

This will add the necessary `stripe_customer_id` and `stripe_subscription_id` columns to your users table.

## Step 2: Configure Stripe API Keys

1. **Get your Stripe API keys:**
   - Go to your [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to Developers → API keys
   - Copy your **Publishable key** and **Secret key**

2. **Add keys to your admin dashboard:**
   - Go to your NuSong admin dashboard (`/admin/login`)
   - Navigate to Site Settings → Stripe tab
   - Enter your Stripe Publishable Key and Secret Key
   - Save the settings

## Step 3: Create Stripe Products and Prices

For each subscription plan, you need to create corresponding products and prices in Stripe:

### 3.1 Create Products

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create a product for each plan (e.g., "Basic Plan", "Premium Plan")
3. Set the product name and description

### 3.2 Create Prices

For each product, create prices for different billing cycles:

#### Weekly Prices
- **Basic Plan**: $2.08/week
- **Premium Plan**: $4.39/week

#### Monthly Prices  
- **Basic Plan**: $9.00/month
- **Premium Plan**: $19.00/month

#### Yearly Prices
- **Basic Plan**: $90.00/year
- **Premium Plan**: $190.00/year

**Important:** When creating prices:
- Set **Billing model** to "Standard pricing"
- Set **Price** to the amount
- Set **Billing period** to the appropriate interval (week/month/year)
- Set **Recurring** to enabled
- Copy the **Price ID** (starts with `price_`)

## Step 4: Update Subscription Plans

1. Go to your admin dashboard → Subscription Plans
2. For each plan, add the Stripe Price IDs:
   - **Weekly Price ID**: The price ID for weekly billing
   - **Monthly Price ID**: The price ID for monthly billing  
   - **Yearly Price ID**: The price ID for yearly billing

## Step 5: Configure Webhooks

### 5.1 Create Webhook Endpoint

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 5.2 Get Webhook Secret

1. After creating the webhook, click on it to view details
2. Copy the **Signing secret** (starts with `whsec_`)
3. Go to your admin dashboard → Site Settings → Stripe tab
4. Enter the webhook secret and save

## Step 6: Test the Integration

### 6.1 Test Mode vs Live Mode

- **Test Mode**: Use test API keys and test card numbers
- **Live Mode**: Use live API keys and real payments

For testing, use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### 6.2 Test the Flow

1. Go to your pricing page (`/pricing`)
2. Click on a subscription plan
3. Choose a billing cycle (weekly/monthly/yearly)
4. Complete the Stripe checkout
5. Verify the subscription is created in your database
6. Check that the user's plan status is updated

## Step 7: Customer Portal Setup

The customer portal allows users to manage their subscriptions:

1. Go to [Stripe Dashboard → Settings → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Configure the portal settings:
   - Enable subscription cancellation
   - Enable payment method updates
   - Enable invoice history
3. Save the configuration

## Step 8: Production Deployment

### 8.1 Switch to Live Mode

1. Get your live API keys from Stripe Dashboard
2. Update your admin dashboard with live keys
3. Update your webhook endpoint to use your production domain
4. Test with a small real payment

### 8.2 Environment Variables

Make sure these environment variables are set in production:

```env
DATABASE_URL=your_production_database_url
NODE_ENV=production
```

## Troubleshooting

### Common Issues

1. **"Stripe secret key not configured"**
   - Make sure you've added the secret key in admin settings
   - Check that the key is correct and not truncated

2. **"No Stripe price ID configured"**
   - Verify that you've added price IDs to your subscription plans
   - Check that the price IDs are correct and active in Stripe

3. **Webhook errors**
   - Verify the webhook URL is correct and accessible
   - Check that the webhook secret is properly configured
   - Ensure your server can receive POST requests

4. **Subscription not updating**
   - Check webhook logs in Stripe Dashboard
   - Verify webhook events are being sent
   - Check server logs for webhook processing errors

### Debug Mode

To enable debug logging, add this to your server startup:

```javascript
// In server/index.ts or similar
process.env.STRIPE_DEBUG = 'true';
```

## Security Considerations

1. **Never expose secret keys** in client-side code
2. **Always verify webhook signatures** (already implemented)
3. **Use HTTPS** in production
4. **Regularly rotate API keys**
5. **Monitor webhook failures**

## Support

If you encounter issues:

1. Check the Stripe Dashboard for error logs
2. Review your server logs for detailed error messages
3. Verify all configuration steps are completed
4. Test with Stripe's test mode first

## API Reference

### Available Endpoints

- `POST /api/stripe/create-checkout-session` - Create Stripe checkout session
- `POST /api/stripe/create-portal-session` - Create customer portal session
- `POST /api/webhooks/stripe` - Stripe webhook endpoint
- `POST /api/stripe/cancel-subscription` - Cancel subscription
- `POST /api/stripe/reactivate-subscription` - Reactivate subscription

### Webhook Events Handled

- `checkout.session.completed` - User completes checkout
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

---

**Note:** This integration uses Stripe Checkout for the payment flow, which provides a secure, hosted payment page. Users will be redirected to Stripe's servers to complete their payment, then redirected back to your site.
