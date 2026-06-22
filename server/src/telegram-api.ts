const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export function telegramEnabled() {
  return Boolean(BOT_TOKEN);
}

export async function telegramApi<T = { ok: boolean }>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!BOT_TOKEN) throw new Error('Telegram bot не настроен');

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    ok?: boolean;
    description?: string;
  };

  if (!res.ok || data.ok === false) {
    throw new Error(data.description ?? `Telegram API ${method} failed`);
  }

  return data;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return false;

  try {
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    return true;
  } catch {
    return false;
  }
}