import { getOrCreateUser, grantPro, linkTelegram } from './db.js';
import { sendTelegramMessage, telegramApi, telegramEnabled } from './telegram-api.js';

const STARS_PRICE = Number(process.env.TELEGRAM_STARS_PRICE ?? 150);
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'PauseTraderAlertsBot';

export function starsEnabled() {
  return telegramEnabled();
}

export function starsPrice() {
  return STARS_PRICE;
}

export function starsPayload(clientId: string) {
  return `pro:${clientId}`;
}

export function parseStarsPayload(payload: string) {
  if (!payload.startsWith('pro:')) return null;
  const clientId = payload.slice(4);
  if (clientId.length < 8) return null;
  return clientId;
}

export async function createStarsInvoiceLink(clientId: string) {
  if (!starsEnabled()) throw new Error('Telegram Stars не настроены');

  getOrCreateUser(clientId);

  const result = await telegramApi<{ result: string }>('createInvoiceLink', {
    title: 'PauseTrader Pro',
    description: 'Подписка Pro на 1 месяц: все монеты, алерты, скринер, шаблоны.',
    payload: starsPayload(clientId),
    currency: 'XTR',
    prices: [{ label: 'Pro · 1 месяц', amount: STARS_PRICE }],
  });

  return {
    url: result.result,
    stars: STARS_PRICE,
    botUsername: BOT_USERNAME,
  };
}

export async function sendStarsInvoice(chatId: string, clientId: string) {
  if (!starsEnabled()) throw new Error('Telegram Stars не настроены');

  getOrCreateUser(clientId);

  await telegramApi('sendInvoice', {
    chat_id: chatId,
    title: 'PauseTrader Pro',
    description: 'Подписка Pro на 1 месяц: все монеты, алерты, скринер, шаблоны.',
    payload: starsPayload(clientId),
    currency: 'XTR',
    prices: [{ label: 'Pro · 1 месяц', amount: STARS_PRICE }],
  });
}

export async function handlePreCheckoutQuery(query: {
  id: string;
  from: { id: number };
  invoice_payload: string;
  currency: string;
  total_amount: number;
}) {
  const clientId = parseStarsPayload(query.invoice_payload);

  let ok = true;
  let errorMessage: string | undefined;

  if (!clientId) {
    ok = false;
    errorMessage = 'Некорректный заказ. Откройте оплату из приложения PauseTrader.';
  } else if (query.currency !== 'XTR' || query.total_amount !== STARS_PRICE) {
    ok = false;
    errorMessage = 'Неверная сумма оплаты.';
  }

  await telegramApi('answerPreCheckoutQuery', {
    pre_checkout_query_id: query.id,
    ok,
    error_message: errorMessage,
  });
}

export async function handleSuccessfulPayment(
  chatId: string,
  payment: {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    telegram_payment_charge_id: string;
  },
) {
  const clientId = parseStarsPayload(payment.invoice_payload);
  if (!clientId) {
    await sendTelegramMessage(chatId, 'Оплата получена, но не удалось активировать Pro. Напишите @AiKtg.');
    return;
  }

  linkTelegram(clientId, chatId);
  const status = grantPro(clientId, 1, 'stars');

  await sendTelegramMessage(
    chatId,
    `✅ <b>PauseTrader Pro активирован!</b>\n\n` +
      `Срок: 1 месяц\n` +
      `ID: <code>${clientId.slice(0, 8)}…</code>\n\n` +
      `Откройте сайт и обновите страницу — все Pro-функции доступны.`,
  );

  console.log('Stars payment:', payment.telegram_payment_charge_id, status.plan);
}

export function starsBotPayUrl(clientId: string) {
  return `https://t.me/${BOT_USERNAME}?start=pay_${clientId}`;
}