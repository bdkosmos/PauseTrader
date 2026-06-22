"""Create PauseTrader Telegram bot via BotFather using local Telegram session."""
import asyncio
import re
import sys

from opentele.td import TDesktop
from opentele.api import UseCurrentSession
from telethon import events

TDATA = r"C:\Users\User\AppData\Roaming\Telegram Desktop\tdata"
BOT_NAME = "PauseTrader Alerts Bot"
BOT_USERNAME = "PauseTraderAlertsBot"


async def main() -> int:
    tdesk = TDesktop(TDATA)
    if not tdesk.isLoaded():
        print("Telegram session not loaded. Log in to Telegram Desktop first.")
        return 1

    client = await tdesk.ToTelethon(session="pausetrader-bot-setup", flag=UseCurrentSession)
    await client.connect()
    if not await client.is_user_authorized():
        print("Telegram not authorized.")
        return 1

    token_holder: dict[str, str] = {}

    @client.on(events.NewMessage(from_users="BotFather"))
    async def handler(event):
        text = event.message.message or ""
        print(f"BotFather: {text[:200]}")
        match = re.search(r"(\d{8,}:[A-Za-z0-9_-]{30,})", text)
        if match:
            token_holder["token"] = match.group(1)

    await client.send_message("BotFather", "/newbot")
    await asyncio.sleep(2)
    await client.send_message("BotFather", BOT_NAME)
    await asyncio.sleep(2)
    await client.send_message("BotFather", BOT_USERNAME)
    await asyncio.sleep(5)

    for _ in range(6):
        if token_holder.get("token"):
            break
        await asyncio.sleep(2)

    await client.disconnect()

    token = token_holder.get("token")
    if not token:
        print("Failed to get bot token from BotFather.")
        return 1

    print(f"TELEGRAM_BOT_TOKEN={token}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))