#!/usr/bin/env python3
"""Seed 3-5 demo markets by calling the agent demo API.

The agent must be running before calling this script.
Each injection triggers the full pipeline: score → reason → mint.
Allow ~15s between injections so nonces don't collide.

Usage:
    python3 seed/inject_demo_signals.py [--count N] [--delay SECONDS]
"""
from __future__ import annotations

import argparse
import sys
import time

try:
    import requests
except ImportError:
    print("pip install requests", file=sys.stderr)
    sys.exit(1)

import os
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent

# Load agent env for secret + port
agent_env = REPO_ROOT / "agent" / ".env"
if agent_env.exists():
    for line in agent_env.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

SECRET = os.getenv("DEMO_API_SECRET", "x9k2vp4z")
HOST = os.getenv("DEMO_API_HOST", "127.0.0.1")
PORT = os.getenv("DEMO_API_PORT", "8787")
BASE = f"http://{HOST}:{PORT}/demo-{SECRET}"


def fetch_candidates() -> list[dict]:
    r = requests.get(f"{BASE}/candidates", timeout=10)
    r.raise_for_status()
    return r.json()["candidates"]


def inject(candidate_id: str) -> dict:
    r = requests.post(f"{BASE}/inject", json={"candidate_id": candidate_id}, timeout=10)
    r.raise_for_status()
    return r.json()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo markets via agent API")
    parser.add_argument("--count", type=int, default=3, help="Number of markets to seed (default 3)")
    parser.add_argument("--delay", type=float, default=20.0, help="Seconds between injections (default 20)")
    args = parser.parse_args()

    print(f"Fetching candidates from {BASE}/candidates ...")
    try:
        candidates = fetch_candidates()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("Is the agent running? Start it with: make run-agent", file=sys.stderr)
        sys.exit(1)

    if not candidates:
        print("No candidates available. Run 'make refresh-candidates' first.", file=sys.stderr)
        sys.exit(1)

    count = min(args.count, len(candidates))
    print(f"Seeding {count} demo markets (delay={args.delay}s between each):\n")

    for i, cand in enumerate(candidates[:count]):
        sym = cand.get("symbol", "?")
        chain = cand.get("chain", "?")
        cid = cand["id"]
        print(f"[{i+1}/{count}] Injecting {sym} ({chain}) — id={cid} ...")
        try:
            result = inject(cid)
            print(f"       OK: {result.get('message', result)}")
        except Exception as e:
            print(f"       FAIL: {e}")

        if i < count - 1:
            print(f"       Waiting {args.delay}s ...")
            time.sleep(args.delay)

    print("\nSeeding complete. Markets will appear on the feed as the agent processes them.")


if __name__ == "__main__":
    main()
