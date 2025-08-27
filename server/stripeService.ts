import Stripe from 'stripe';
import { storage } from './storage';

// Initialize Stripe with secret key from database
let stripe: Stripe | null = null;

async function getStripeInstance(): Promise<Stripe> {
  if (stripe) {
    return stripe;
  }

  const stripeSetting = await storage.getSiteSetting('stripe_secret_key');
  if (!stripeSetting || !stripeSetting.value) {
    throw new Error('Stripe secret key not configured');
  }

  stripe = new Stripe(stripeSetting.value, {
    apiVersion: '2024-12-18.acacia',
  });

  return stripe;
}

export interface CreateCheckoutSessionParams {
  userId: string;
  planId: string;
  billingCycle: 'weekly' | 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({
  userId,
  planId,
  billingCycle,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const stripeInstance = await getStripeInstance();

  // Get the plan details
  const plan = await storage.getSubscriptionPlan(planId);
  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  // Get the appropriate price ID based on billing cycle
  let priceId: string | undefined;
  switch (billingCycle) {
    case 'weekly':
      priceId = plan.weeklyPriceId || undefined;
      break;
    case 'monthly':
      priceId = plan.monthlyPriceId || undefined;
      break;
    case 'yearly':
      priceId = plan.yearlyPriceId || undefined;
      break;
  }

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for ${billingCycle} billing cycle`);
  }

  // Get user details
  const user = await storage.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Create checkout session
  const session = await stripeInstance.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: user.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
      billingCycle,
    },
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        userId,
        planId,
        billingCycle,
      },
    },
  });

  return session;
}

export async function createCustomerPortalSession(userId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
  const stripeInstance = await getStripeInstance();

  // Get user details
  const user = await storage.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  
  if (!customerId) {
    // Create new customer
    const customer = await stripeInstance.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId,
      },
    });
    
    customerId = customer.id;
    
    // Update user with Stripe customer ID
    await storage.updateUser(userId, {
      stripeCustomerId: customerId,
    });
  }

  // Create portal session
  const session = await stripeInstance.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const stripeInstance = await getStripeInstance();

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, planId, billingCycle } = session.metadata || {};
  
  if (!userId || !planId) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Get the plan details
  const plan = await storage.getSubscriptionPlan(planId);
  if (!plan) {
    console.error('Plan not found:', planId);
    return;
  }

  // Calculate plan end date based on billing cycle
  const startDate = new Date();
  const endDate = new Date();
  
  switch (billingCycle) {
    case 'weekly':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  // Update user subscription
  await storage.updateUser(userId, {
    subscriptionPlanId: planId,
    // Do NOT mark active here. Checkout completion can mean trialing/unpaid.
    planStatus: 'inactive',
    planStartDate: startDate,
    planEndDate: endDate,
    generationsUsedThisMonth: 0, // Reset usage
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
  });

  console.log(`User ${userId} subscribed to plan ${planId} with ${billingCycle} billing`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const { userId, planId } = subscription.metadata || {};
  
  if (!userId || !planId) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  // Update user with subscription details
  await storage.updateUser(userId, {
    stripeSubscriptionId: subscription.id,
    planStatus: subscription.status === 'active' ? 'active' : 'inactive',
  });

  console.log(`Subscription created for user ${userId}: ${subscription.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const { userId } = subscription.metadata || {};
  
  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  // Update user subscription status
  let planStatus: 'active' | 'inactive' | 'cancelled' = 'inactive';
  
  switch (subscription.status) {
    case 'active':
      planStatus = 'active';
      break;
    case 'canceled':
    case 'unpaid':
      planStatus = 'cancelled';
      break;
    default:
      planStatus = 'inactive';
  }

  await storage.updateUser(userId, {
    planStatus,
  });

  console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const { userId } = subscription.metadata || {};
  
  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  // Downgrade user to free plan
  await storage.updateUser(userId, {
    subscriptionPlanId: null,
    planStatus: 'free',
    planStartDate: null,
    planEndDate: null,
    stripeSubscriptionId: null,
  });

  console.log(`Subscription cancelled for user ${userId}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log('=== HANDLING INVOICE PAYMENT SUCCEEDED ===');
  console.log('Invoice ID:', invoice.id);
  console.log('Subscription ID:', invoice.subscription);
  console.log('Amount paid (cents):', invoice.amount_paid);
  
  if (!invoice.subscription) {
    console.log('No subscription found in invoice');
    return;
  }

  // Only consider as an activation when a positive payment is made
  if (typeof invoice.amount_paid === 'number' && invoice.amount_paid <= 0) {
    console.log('Zero-amount invoice succeeded (likely trial). Skipping activation.');
    return;
  }

  // Get subscription details
  const stripeInstance = await getStripeInstance();
  const subscription = await stripeInstance.subscriptions.retrieve(invoice.subscription as string);
  
  console.log('Subscription metadata:', subscription.metadata);
  let { userId } = subscription.metadata || {} as any;

  // Fallback: resolve user by Stripe customer email if metadata missing
  if (!userId) {
    try {
      const customerId = subscription.customer as string | undefined;
      if (customerId) {
        const customer = await stripeInstance.customers.retrieve(customerId as string);
        const customerEmail = (customer as any)?.email as string | undefined;
        if (customerEmail) {
          const userByEmail = await storage.getUserByEmail(customerEmail);
          if (userByEmail) {
            userId = userByEmail.id;
            console.log('Resolved userId from customer email:', userId);
          }
        }
      }
    } catch (fallbackErr) {
      console.warn('Failed fallback user resolution by customer email:', fallbackErr);
    }
  }

  if (!userId) {
    console.log('Could not resolve userId for payment succeeded handling');
    return;
  }

  // Reset monthly usage and extend subscription
  const user = await storage.getUserById(userId);
  if (!user || !user.subscriptionPlanId) {
    return;
  }

  const plan = await storage.getSubscriptionPlan(user.subscriptionPlanId);
  if (!plan) {
    return;
  }

  // Calculate new end date based on current billing cycle
  const currentEndDate = user.planEndDate ? new Date(user.planEndDate) : new Date();
  const newEndDate = new Date(currentEndDate);
  
  // Determine billing cycle from subscription
  const interval = subscription.items.data[0]?.price.recurring?.interval;
  switch (interval) {
    case 'week':
      newEndDate.setDate(newEndDate.getDate() + 7);
      break;
    case 'month':
      newEndDate.setMonth(newEndDate.getMonth() + 1);
      break;
    case 'year':
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      break;
  }

  const updatePayload: any = {
    planStatus: 'active',
    planEndDate: newEndDate,
    generationsUsedThisMonth: 0, // Reset usage
  };

  // Ensure subscriptionPlanId is set if missing but present in subscription metadata
  const subscriptionPlanIdFromMetadata = (subscription.metadata as any)?.planId as string | undefined;
  if (!user.subscriptionPlanId && subscriptionPlanIdFromMetadata) {
    updatePayload.subscriptionPlanId = subscriptionPlanIdFromMetadata;
  }

  await storage.updateUser(userId, updatePayload);

  console.log(`Payment succeeded for user ${userId}, subscription extended`);
  console.log('=== INVOICE PAYMENT SUCCEEDED HANDLING COMPLETE ===');
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription) {
    return;
  }

  // Get subscription details
  const stripeInstance = await getStripeInstance();
  const subscription = await stripeInstance.subscriptions.retrieve(invoice.subscription as string);
  
  const { userId } = subscription.metadata || {};
  if (!userId) {
    return;
  }

  // Update user status to inactive
  await storage.updateUser(userId, {
    planStatus: 'inactive',
  });

  console.log(`Payment failed for user ${userId}`);
}

export async function verifyWebhookSignature(payload: string, signature: string): Promise<Stripe.Event> {
  const stripeInstance = await getStripeInstance();
  const webhookSetting = await storage.getSiteSetting('stripe_webhook_secret');
  
  console.log('=== WEBHOOK SIGNATURE VERIFICATION DEBUG ===');
  console.log('Webhook setting from database:', webhookSetting);
  console.log('Webhook setting value:', webhookSetting?.value);
  console.log('Webhook setting value length:', webhookSetting?.value?.length);
  console.log('Signature from request:', signature);
  console.log('Signature length:', signature?.length);
  console.log('===========================================');
  
  if (!webhookSetting || !webhookSetting.value) {
    throw new Error('Stripe webhook secret not configured');
  }

  try {
    return stripeInstance.webhooks.constructEvent(payload, signature, webhookSetting.value);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    throw new Error(`Webhook signature verification failed: ${error}`);
  }
}

export async function cancelSubscription(userId: string): Promise<void> {
  const stripeInstance = await getStripeInstance();
  
  const user = await storage.getUserById(userId);
  if (!user || !user.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  // Cancel subscription at period end
  await stripeInstance.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Update user status
  await storage.updateUser(userId, {
    planStatus: 'cancelled',
  });

  console.log(`Subscription cancelled for user ${userId}`);
}

export async function reactivateSubscription(userId: string): Promise<void> {
  const stripeInstance = await getStripeInstance();
  
  const user = await storage.getUserById(userId);
  if (!user || !user.stripeSubscriptionId) {
    throw new Error('No subscription found');
  }

  // Reactivate subscription
  await stripeInstance.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  // Update user status
  await storage.updateUser(userId, {
    planStatus: 'active',
  });

  console.log(`Subscription reactivated for user ${userId}`);
}
