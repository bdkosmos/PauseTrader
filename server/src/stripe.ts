import Stripe from 'stripe';
import {
  findUserByStripeCustomer,
  findUserByStripeSubscription,
  getOrCreateUser,
  revokePro,
  setStripeSubscription,
} from './db.js';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

export const stripe = stripeKey ? new Stripe(stripeKey) : null;

export function stripeEnabled() {
  return Boolean(stripe && priceId);
}

export async function createCheckoutSession(
  clientId: string,
  successUrl: string,
  cancelUrl: string,
) {
  if (!stripe || !priceId) {
    throw new Error('Stripe не настроен на сервере');
  }

  getOrCreateUser(clientId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    client_reference_id: clientId,
    metadata: { clientId },
    subscription_data: {
      metadata: { clientId },
    },
  });

  if (!session.url) throw new Error('Не удалось создать сессию оплаты');
  return session.url;
}

export async function verifyCheckoutSession(clientId: string, sessionId: string) {
  if (!stripe) throw new Error('Stripe не настроен');

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  const ownerId = session.client_reference_id ?? session.metadata?.clientId;
  if (!ownerId || ownerId !== clientId) {
    throw new Error('Сессия не принадлежит этому устройству');
  }

  if (session.status !== 'complete' || session.payment_status !== 'paid') {
    throw new Error('Оплата ещё не завершена');
  }

  const subscription = session.subscription;
  if (!subscription || typeof subscription === 'string') {
    throw new Error('Подписка не найдена');
  }

  return setStripeSubscription(
    clientId,
    String(session.customer),
    subscription.id,
    subscription.current_period_end * 1000,
    session.customer_details?.email ?? undefined,
  );
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined,
) {
  if (!stripe) throw new Error('Stripe не настроен');

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET не задан');

  const event = stripe.webhooks.constructEvent(rawBody, signature ?? '', secret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const clientId = session.client_reference_id ?? session.metadata?.clientId;
      if (!clientId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(String(session.subscription));
      const expiresAt = sub.current_period_end * 1000;
      setStripeSubscription(
        clientId,
        String(session.customer),
        sub.id,
        expiresAt,
        session.customer_email ?? undefined,
      );
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const clientId = sub.metadata?.clientId;
      const user =
        (clientId ? getOrCreateUser(clientId) : undefined) ??
        findUserByStripeSubscription(sub.id) ??
        findUserByStripeCustomer(String(sub.customer));

      if (!user) break;

      if (sub.status === 'active' || sub.status === 'trialing') {
        setStripeSubscription(
          user.client_id,
          String(sub.customer),
          sub.id,
          sub.current_period_end * 1000,
        );
      } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
        revokePro(user.client_id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const user = findUserByStripeSubscription(sub.id);
      if (user) revokePro(user.client_id);
      break;
    }

    default:
      break;
  }

  return { received: true };
}