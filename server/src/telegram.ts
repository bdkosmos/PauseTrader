import { getActiveAlerts, getTelegramChatId, linkTelegram, markAlertTriggered } from './db.js';
import { sendTelegramMessage, telegramEnabled } from './telegram-api.js';
import {
  handlePreCheckoutQuery,
  handleSuccessfulPayment,
  sendStarsInvoice,
} from './telegram-stars.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const NTFY_BASE = (process.env.NTFY_BASE_URL ?? 'https://ntfy.sh').replace(/\/$/, '');

export { telegramEnabled } from './telegram-api.js';

export function ntfyEnabled() {
  return true;
}

export function ntfyTopicForClient(clientId: string) {
  const slug = clientId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase();
  return `pausetrader-${slug || 'alerts'}`;
}

export function ntfyUrlForClient(clientId: string) {
  return `${NTFY_BASE}/${ntfyTopicForClient(clientId)}`;
}

export async function handleTelegramUpdate(update: Record<string, unknown>) {
  const preCheckout = update.pre_checkout_query as
    | {
        id: string;
        from: { id: number };
        invoice_payload: string;
        currency: string;
        total_amount: number;
      }
    | undefined;

  if (preCheckout) {
    await handlePreCheckoutQuery(preCheckout);
    return;
  }

  const message = update.message as
    | {
        chat: { id: number };
        text?: string;
        successful_payment?: {
          currency: string;
          total_amount: number;
          invoice_payload: string;
          telegram_payment_charge_id: string;
        };
      }
    | undefined;

  if (!message) return;

  const chatId = String(message.chat.id);

  if (message.successful_payment) {
    await handleSuccessfulPayment(chatId, message.successful_payment);
    return;
  }

  if (!message.text) return;

  const text = message.text.trim();

  if (text === '/terms') {
    await sendTelegramMessage(
      chatId,
      '<b>Условия PauseTrader Pro</b>\n\n' +
        'Цифровая подписка на 1 месяц. Возврат — в течение 7 дней через /paysupport.\n' +
        'Сайт: https://bdkosmos.github.io/PauseTrader/',
    );
    return;
  }

  if (text === '/support' || text === '/paysupport') {
    await sendTelegramMessage(
      chatId,
      'Поддержка: @AiKtg\nОпишите проблему с оплатой или активацией Pro.',
    );
    return;
  }

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const arg = parts[1] ?? '';

    if (arg.startsWith('pay_') && arg.length > 12) {
      const clientId = arg.slice(4);
      await sendStarsInvoice(chatId, clientId);
      return;
    }

    if (arg.length >= 8) {
      linkTelegram(arg, chatId);
      await sendTelegramMessage(
        chatId,
        '✅ Telegram подключён к PauseTrader Pro.\nАлерты будут приходить сюда.',
      );
      return;
    }

    await sendTelegramMessage(
      chatId,
      'PauseTrader Pro\n\n' +
        'Оплатите Pro звёздами в приложении или напишите /support.',
    );
    return;
  }

  if (text === '/pro' || text === '/buy') {
    await sendTelegramMessage(
      chatId,
      'Откройте https://bdkosmos.github.io/PauseTrader/ → Free · Pro → «Оплатить звёздами».',
    );
  }
}

export async function sendNtfyAlert(topic: string, title: string, message: string) {
  const res = await fetch(`${NTFY_BASE}/${topic}`, {
    method: 'POST',
    headers: {
      Title: title,
      Priority: 'high',
      Tags: 'chart,moneybag',
    },
    body: message,
  });
  return res.ok;
}

let polling = false;
let pollOffset = 0;

export function startTelegramPolling() {
  if (!BOT_TOKEN || polling) return;
  polling = true;

  const poll = async () => {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=25&offset=${pollOffset}`,
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        ok: boolean;
        result: Array<{ update_id: number; message?: Record<string, unknown> }>;
      };
      if (!data.ok) return;

      for (const update of data.result) {
        pollOffset = update.update_id + 1;
        await handleTelegramUpdate(update as Record<string, unknown>);
      }
    } catch (err) {
      console.error('Telegram poll:', err);
    } finally {
      setTimeout(poll, 1500);
    }
  };

  void poll();
  console.log('Telegram polling: on');
}

export async function sendTestAlert(clientId: string) {
  const text = 'Тестовый алерт PauseTrader — всё работает!';
  const chatId = getTelegramChatId(clientId);

  if (chatId && BOT_TOKEN) {
    const sent = await sendTelegramMessage(chatId, `🔔 <b>PauseTrader</b>\n${text}`);
    if (sent) return { channel: 'telegram' as const };
  }

  const sent = await sendNtfyAlert(
    ntfyTopicForClient(clientId),
    'PauseTrader · тест',
    text,
  );
  if (sent) return { channel: 'ntfy' as const };

  throw new Error('Подключите Telegram или ntfy перед тестом');
}

export async function checkPriceAlerts() {
  const alerts = getActiveAlerts();
  if (alerts.length === 0) return;

  const symbols = [...new Set(alerts.map((a) => a.symbol))];
  const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
  const res = await fetch(url);
  if (!res.ok) return;

  const prices = (await res.json()) as Array<{ symbol: string; price: string }>;
  const priceMap = new Map(prices.map((p) => [p.symbol, parseFloat(p.price)]));

  for (const alert of alerts) {
    const current = priceMap.get(alert.symbol);
    if (current === undefined) continue;

    const hit =
      alert.direction === 'above'
        ? current >= alert.price
        : current <= alert.price;

    if (!hit) continue;

    const arrow = alert.direction === 'above' ? '▲' : '▼';
    const text = `${alert.base}/USDT ${arrow} ${alert.price}\nТекущая: ${current}`;
    let sent = false;

    const chatId = getTelegramChatId(alert.client_id);
    if (chatId && BOT_TOKEN) {
      sent = await sendTelegramMessage(
        chatId,
        `🔔 <b>PauseTrader</b>\n${text}`,
      );
    }

    if (!sent) {
      sent = await sendNtfyAlert(
        ntfyTopicForClient(alert.client_id),
        `PauseTrader · ${alert.base}`,
        text,
      );
    }

    if (sent) markAlertTriggered(alert.id);
  }
}