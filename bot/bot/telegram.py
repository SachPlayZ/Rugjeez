from __future__ import annotations

import aiohttp
import structlog

log = structlog.get_logger()


async def post(bot_token: str, chat_id: str, text: str) -> bool:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": False,
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url, json=payload, timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                data = await resp.json()
                if data.get("ok"):
                    log.info("telegram_posted", chat_id=chat_id)
                    return True
                log.error(
                    "telegram_post_failed",
                    description=data.get("description"),
                    code=data.get("error_code"),
                )
                return False
    except Exception as exc:
        log.error("telegram_post_error", error=str(exc))
        return False
