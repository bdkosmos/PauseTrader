import { getActiveAlerts, getTelegramChatId, markAlertTriggered } from './db.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const NTFY_BASE = (process.env.NTFY_BASE_URL ?? 'https://ntfy.sh').replace(/\/$/, '');

export function telegramEnabled() {
  return Boolean(BOT_TOKEN);
}

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

export async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return false;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  return res.ok;
}

export async function handleTelegramUpdate(update: Record<string, unknown>) {
  const message = update.message as
    | { chat: { id: number }; text?: string }
    | undefined;
  if (!message?.text) return;

  const text = message.text.trim();
  const chatId = String(message.chat.id);

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const clientId = parts[1];
    if (clientId && clientId.length >= 8) {
      const { linkTelegram } = await import('./db.js');
      linkTelegram(clientId, chatId);
      await sendTelegramMessage(
        chatId,
        '✅ Telegram подключён к PauseTrader Pro.\nАлерты будут приходить сюда.',
      );
      return;
    }

    await sendTelegramMessage(
      chatId,
      'PauseTrader Pro Alerts\n\nОткройте приложение → Pro → Алерты → «Подключить Telegram» и перейдите по ссылке.',
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
        if (update.message) await handleTelegramUpdate({ message: update.message });
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