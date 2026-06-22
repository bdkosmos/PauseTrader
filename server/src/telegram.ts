import { getActiveAlerts, getTelegramChatId, markAlertTriggered } from './db.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export function telegramEnabled() {
  return Boolean(BOT_TOKEN);
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

export async function checkPriceAlerts() {
  if (!BOT_TOKEN) return;

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

    const chatId = getTelegramChatId(alert.client_id);
    if (!chatId) continue;

    const arrow = alert.direction === 'above' ? '▲' : '▼';
    const sent = await sendTelegramMessage(
      chatId,
      `🔔 <b>PauseTrader</b>\n${alert.base}/USDT ${arrow} ${alert.price}\nТекущая: <b>${current}</b>`,
    );

    if (sent) markAlertTriggered(alert.id);
  }
}