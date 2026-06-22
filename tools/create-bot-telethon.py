"""Create PauseTrader bot via BotFather using existing Telethon session."""
import asyncio
import re
import sys

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

API_ID = 4
API_HASH = "014b35b6181870cbf1830dcbf8988f3f"
SESSION = r"C:\Users\User\AiKSupportBot\session_aik"

BOT_NAMES = [
    ("PauseTrader Pro", "PauseTraderProBot"),
    ("PauseTrader Pro", "PauseTraderPayBot"),
    ("PauseTrader Pro", "PauseTraderStarsBot"),
    ("PauseTrader Alerts", "PauseTraderAlertsBot"),
]


async def ask_botfather(client, text: str, timeout: int = 8) -> str:
    await client.send_message("BotFather", text)
    await asyncio.sleep(timeout)
    messages = await client.get_messages("BotFather", limit=3)
    for msg in messages:
        if msg.out:
            continue
        if msg.message:
            return msg.message
    return ""


async def main() -> int:
    client = TelegramClient(SESSION, API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("Telegram session not authorized")
        return 1

    token = None
    username = None

    for display_name, bot_username in BOT_NAMES:
        print(f"Trying {bot_username}...")
        r1 = await ask_botfather(client, "/newbot", 3)
        print(f"BotFather: {r1[:120]}")

        r2 = await ask_botfather(client, display_name, 3)
        print(f"BotFather: {r2[:120]}")

        r3 = await ask_botfather(client, bot_username, 5)
        print(f"BotFather: {r3[:200]}")

        match = re.search(r"(\d{8,}:[A-Za-z0-9_-]{30,})", r3)
        if match:
            token = match.group(1)
            username = bot_username
            break

        if "already taken" not in r3.lower() and "invalid" not in r3.lower():
            match = re.search(r"@(\w+)", r3)
            if match:
                username = match.group(1)

    await client.disconnect()

    if not token:
        print("Failed to create bot")
        return 1

    token_file = r"E:\PauseTrader\tools\.telegram-token"
    with open(token_file, "w", encoding="utf-8") as f:
        f.write(token)

    print(f"TELEGRAM_BOT_TOKEN={token}")
    print(f"TELEGRAM_BOT_USERNAME={username}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except SessionPasswordNeededError:
        print("2FA required on Telegram session")
        raise SystemExit(1)