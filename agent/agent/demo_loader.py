from __future__ import annotations

import base64
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

import aiohttp

from agent.logging import get_logger

log = get_logger(__name__)

_NFI_REPO = os.getenv("NFI_REPO", "iterativv/NostalgiaForInfinity")
_NFI_BLACKLIST_PATH = os.getenv("NFI_BLACKLIST_PATH", "configs/blacklist-binance.json")
_GITHUB_API = "https://api.github.com"
_GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

_DATA_DIR = Path(__file__).parent / "data"
_CANDIDATES_PATH = _DATA_DIR / "demo_candidates.json"
_GITHUB_CACHE_PATH = _DATA_DIR / "github_cache.json"
_SYMBOL_MAP_PATH = _DATA_DIR / "symbol_map.json"


def _load_json(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            pass
    return default


def _save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def _parse_blacklist(content: str) -> set[str]:
    cleaned = re.sub(r"//[^\n]*", "", content)
    try:
        data = json.loads(cleaned)
        pairs: list[str] = data.get("exchange", {}).get("pair_blacklist", [])
    except Exception:
        pairs = re.findall(r'"([^"]+)"', content)

    symbols: set[str] = set()
    for pattern in pairs:
        m = re.match(r"\(([^)]+)\)/", pattern)
        if not m:
            continue
        for raw_sym in m.group(1).split("|"):
            sym = raw_sym.strip()
            if re.match(r"^[A-Z0-9]{2,20}$", sym):
                symbols.add(sym)
    return symbols


async def _github_get(
    session: aiohttp.ClientSession,
    url: str,
    etag: str | None = None,
) -> tuple[Any | None, str | None, int]:
    headers: dict[str, str] = {"Accept": "application/vnd.github.v3+json"}
    if _GITHUB_TOKEN:
        headers["Authorization"] = f"token {_GITHUB_TOKEN}"
    if etag:
        headers["If-None-Match"] = etag

    async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
        new_etag = resp.headers.get("ETag")
        if resp.status == 304:
            return None, etag, 304
        resp.raise_for_status()
        return await resp.json(), new_etag, resp.status


async def refresh_candidates() -> list[dict]:
    """
    Fetch recent NFI blacklist commits, diff consecutive snapshots to find
    newly added symbols, return up to 10 mapped candidates.

    ETag caching: commits list uses HTTP ETag (304 short-circuit).
    Per-SHA file content cached in github_cache.json since SHA URLs are immutable.
    """
    symbol_map: dict[str, dict] = _load_json(_SYMBOL_MAP_PATH, {})
    cache: dict[str, Any] = _load_json(_GITHUB_CACHE_PATH, {})
    symbol_cache: dict[str, list[str]] = cache.get("_symbol_cache", {})

    commits_url = (
        f"{_GITHUB_API}/repos/{_NFI_REPO}/commits"
        f"?path={_NFI_BLACKLIST_PATH}&per_page=20"
    )

    commits: list[dict] = []

    async with aiohttp.ClientSession() as session:
        commits_etag = cache.get("commits_etag")
        commits_data, new_etag, status = await _github_get(session, commits_url, commits_etag)

        if new_etag:
            cache["commits_etag"] = new_etag

        if status == 304:
            log.info("github_commits_304_cached")
            # Use commit order stored in cache; recompute candidates in case symbol_map changed
            commits = cache.get("commits_order", [])
        else:
            commits = commits_data or []
            cache["commits_order"] = [
                {
                    "sha": c["sha"],
                    "html_url": c["html_url"],
                    "commit": {
                        "committer": {"date": c["commit"]["committer"]["date"]},
                        "message": c["commit"]["message"],
                    },
                }
                for c in commits
            ]

        if len(commits) < 2:
            log.warning("github_commits_insufficient", count=len(commits))
            _save_json(_GITHUB_CACHE_PATH, cache)
            return _load_json(_CANDIDATES_PATH, [])

        # Fetch file content for each commit SHA we don't have cached
        for commit in commits:
            sha = commit["sha"]
            if sha in symbol_cache:
                continue
            content_url = (
                f"{_GITHUB_API}/repos/{_NFI_REPO}/contents"
                f"/{_NFI_BLACKLIST_PATH}?ref={sha}"
            )
            try:
                content_data, _, _ = await _github_get(session, content_url)
                if content_data and "content" in content_data:
                    raw = base64.b64decode(content_data["content"]).decode("utf-8")
                    symbol_cache[sha] = list(_parse_blacklist(raw))
            except Exception as exc:
                log.error("github_content_error", sha=sha[:8], error=str(exc))
                symbol_cache[sha] = []

        cache["_symbol_cache"] = symbol_cache
        _save_json(_GITHUB_CACHE_PATH, cache)

    # Diff consecutive commits (newest first) to find additions
    added: list[dict] = []
    seen_symbols: set[str] = set()

    for i, commit in enumerate(commits):
        sha = commit["sha"]
        syms = set(symbol_cache.get(sha, []))

        if i == 0:
            seen_symbols = syms
            continue

        # symbols in commit[i-1] (newer) but not in commit[i] (older) = added
        newer_commit = commits[i - 1]
        newly_added = seen_symbols - syms

        commit_date = newer_commit["commit"]["committer"]["date"]
        commit_msg = newer_commit["commit"]["message"].split("\n")[0][:80]
        commit_url = newer_commit["html_url"]
        sha_short = newer_commit["sha"][:8]

        for sym in sorted(newly_added):
            if len(added) >= 10:
                break
            if sym not in symbol_map:
                continue
            if any(c["symbol"] == sym for c in added):
                continue
            candidate_id = hashlib.sha256(f"{sym}:{sha_short}".encode()).hexdigest()[:12]
            token_info = symbol_map[sym]
            added.append(
                {
                    "id": candidate_id,
                    "symbol": sym,
                    "chain": token_info["chain"],
                    "token_id": token_info["token_id"],
                    "added_in_commit": sha_short,
                    "added_at": commit_date,
                    "commit_url": commit_url,
                    "summary": f"iterativv added {sym} to the NFI blacklist — {commit_msg}",
                }
            )

        seen_symbols = syms
        if len(added) >= 10:
            break

    if added:
        _save_json(_CANDIDATES_PATH, added)
        log.info("candidates_refreshed", count=len(added))
        return added

    log.warning("no_mapped_candidates_found", fallback_cached=True)
    return _load_json(_CANDIDATES_PATH, [])
