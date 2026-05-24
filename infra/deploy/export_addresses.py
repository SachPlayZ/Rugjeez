#!/usr/bin/env python3
"""Push addresses from deployed.json into agent/.env and web/.env.local."""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
DEPLOYED = REPO_ROOT / "infra" / "deployed.json"


def load_deployed() -> dict:
    if not DEPLOYED.exists():
        print(f"ERROR: {DEPLOYED} not found. Run deploy-contracts first.", file=sys.stderr)
        sys.exit(1)
    return json.loads(DEPLOYED.read_text())


def upsert_env(env_path: Path, updates: dict[str, str]) -> None:
    """Set keys in an .env file, adding missing lines at the end."""
    text = env_path.read_text() if env_path.exists() else ""
    lines = text.splitlines(keepends=True)

    for key, value in updates.items():
        pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
        replacement = f"{key}={value}"
        if pattern.search(text):
            text = pattern.sub(replacement, text)
        else:
            text = text.rstrip("\n") + f"\n{replacement}\n"

    env_path.write_text(text)
    print(f"Updated {env_path.relative_to(REPO_ROOT)}")


def main() -> None:
    data = load_deployed()
    contracts = data["contracts"]
    roles = data["roles"]

    market_registry = contracts["MarketRegistry"]
    trace_registry = contracts["TraceRegistry"]
    agent_address = roles["agent"]

    # agent/.env
    agent_env = REPO_ROOT / "agent" / ".env"
    upsert_env(agent_env, {
        "MARKET_REGISTRY_ADDRESS": market_registry,
        "TRACE_REGISTRY_ADDRESS": trace_registry,
    })

    # web/.env.local
    web_env = REPO_ROOT / "web" / ".env.local"
    upsert_env(web_env, {
        "NEXT_PUBLIC_MARKET_REGISTRY_ADDRESS": market_registry,
        "NEXT_PUBLIC_TRACE_REGISTRY_ADDRESS": trace_registry,
        "NEXT_PUBLIC_AGENT_ADDRESS": agent_address,
    })

    # bot/.env
    bot_env = REPO_ROOT / "bot" / ".env"
    upsert_env(bot_env, {
        "MARKET_REGISTRY_ADDRESS": market_registry,
        "TRACE_REGISTRY_ADDRESS": trace_registry,
    })

    print("Address export complete.")
    print(f"  MarketRegistry: {market_registry}")
    print(f"  TraceRegistry:  {trace_registry}")
    print(f"  Agent:          {agent_address}")


if __name__ == "__main__":
    main()
