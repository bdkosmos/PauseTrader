import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  activateLicense,
  createLicense,
  getSubscriptionStatus,
  grantPro,
  saveAlert,
} from './db.js';
import { createCheckoutSession, handleStripeWebhook, stripeEnabled } from './stripe.js';
import { checkPriceAlerts, handleTelegramUpdate, telegramEnabled } from './telegram.js';

const PORT = Number(process.env.PORT ?? 8787);
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

const app = express();

const allowedOrigins = [
  APP_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://bdkosmos.github.io',
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o.replace(/\/$/, '')))) {
        return cb(null, true);
      }
      if (origin.includes('github.io')) return cb(null, true);
      cb(null, false);
    },
  }),
);

app.post(
  '/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      await handleStripeWebhook(req.body as Buffer, req.headers['stripe-signature'] as string);
      res.json({ received: true });
    } catch (err) {
      console.error('Stripe webhook error:', err);
      res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  },
);

app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({
    ok: true,
    stripe: stripeEnabled(),
    telegram: telegramEnabled(),
  });
});

app.get('/api/v1/subscription/status', (req, res) => {
  const clientId = String(req.query.clientId ?? '');
  if (!clientId || clientId.length < 8) {
    return res.status(400).json({ error: 'clientId обязателен' });
  }
  res.json(getSubscriptionStatus(clientId));
});

app.post('/api/v1/checkout/create', async (req, res) => {
  try {
    const { clientId } = req.body as { clientId?: string };
    if (!clientId) return res.status(400).json({ error: 'clientId обязателен' });

    const successUrl = `${APP_URL}/?checkout=success`;
    const cancelUrl = `${APP_URL}/?checkout=cancel`;
    const url = await createCheckoutSession(clientId, successUrl, cancelUrl);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Ошибка оплаты',
    });
  }
});

app.post('/api/v1/license/activate', (req, res) => {
  const { clientId, licenseKey } = req.body as {
    clientId?: string;
    licenseKey?: string;
  };

  if (!clientId || !licenseKey) {
    return res.status(400).json({ error: 'clientId и licenseKey обязательны' });
  }

  const result = activateLicense(clientId, licenseKey);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result.status);
});

app.post('/api/v1/alerts/sync', (req, res) => {
  const { clientId, alerts } = req.body as {
    clientId?: string;
    alerts?: Array<{
      id: string;
      symbol: string;
      base: string;
      price: number;
      direction: 'above' | 'below';
    }>;
  };

  if (!clientId || !Array.isArray(alerts)) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }

  const status = getSubscriptionStatus(clientId);
  if (status.plan !== 'pro') {
    return res.status(403).json({ error: 'Алерты доступны только в Pro' });
  }

  for (const alert of alerts) {
    saveAlert(alert.id, clientId, alert.symbol, alert.base, alert.price, alert.direction);
  }

  res.json({ ok: true, synced: alerts.length });
});

app.get('/api/v1/telegram/link-url', (req, res) => {
  const clientId = String(req.query.clientId ?? '');
  if (!clientId) return res.status(400).json({ error: 'clientId обязателен' });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'AiKtg';
  res.json({
    url: `https://t.me/${botUsername}?start=${clientId}`,
    enabled: telegramEnabled(),
  });
});

app.post('/api/v1/webhooks/telegram', async (req, res) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (
    process.env.TELEGRAM_WEBHOOK_SECRET &&
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await handleTelegramUpdate(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook:', err);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

app.post('/api/v1/admin/license/generate', (req, res) => {
  const { secret, months, note } = req.body as {
    secret?: string;
    months?: number;
    note?: string;
  };

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const m = Math.max(1, Math.min(24, months ?? 1));
  const key = createLicense(m, note);
  res.json({ licenseKey: key, months: m });
});

app.post('/api/v1/admin/grant', (req, res) => {
  const { secret, clientId, months } = req.body as {
    secret?: string;
    clientId?: string;
    months?: number;
  };

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!clientId) return res.status(400).json({ error: 'clientId обязателен' });

  const m = Math.max(1, Math.min(24, months ?? 1));
  const status = grantPro(clientId, m, 'admin');
  res.json(status);
});

setInterval(() => {
  checkPriceAlerts().catch((err) => console.error('Alert check:', err));
}, 30_000);

app.listen(PORT, () => {
  console.log(`PauseTrader API → http://localhost:${PORT}`);
  console.log(`Frontend URL: ${APP_URL}`);
  console.log(`Stripe: ${stripeEnabled() ? 'on' : 'off'}`);
  console.log(`Telegram: ${telegramEnabled() ? 'on' : 'off'}`);
});