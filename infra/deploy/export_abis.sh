#!/usr/bin/env bash
# Export compiled ABIs from contracts/out/ to agent and web ABI directories.
# Run after every contract change.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_OUT="$REPO_ROOT/contracts/out"
AGENT_ABIS="$REPO_ROOT/agent/agent/abis"
WEB_ABIS="$REPO_ROOT/web/src/lib/abis"

CONTRACTS=(BinaryMarket MarketRegistry TraceRegistry)

for name in "${CONTRACTS[@]}"; do
  SRC="$CONTRACTS_OUT/$name.sol/$name.json"
  if [[ ! -f "$SRC" ]]; then
    echo "ERROR: $SRC not found — run 'forge build' first" >&2
    exit 1
  fi

  # Extract abi field, wrap as {"abi": [...]} — matches agent _load_abi() and web .abi import
  python3 -c "import json,sys; d=json.load(open('$SRC')); json.dump({'abi': d['abi']}, sys.stdout, indent=2); print()" \
    > "$AGENT_ABIS/$name.json"

  python3 -c "import json,sys; d=json.load(open('$SRC')); json.dump({'abi': d['abi']}, sys.stdout, indent=2); print()" \
    > "$WEB_ABIS/$name.json"

  echo "Exported $name.json → agent/agent/abis/ + web/src/lib/abis/"
done

echo "ABI export complete."
