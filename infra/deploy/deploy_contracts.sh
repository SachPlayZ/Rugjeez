#!/usr/bin/env bash
# Deploy MarketRegistry + TraceRegistry to Arc Testnet.
# Writes addresses back to infra/deployed.json.
# Usage: ./deploy/deploy_contracts.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INFRA_DIR="$REPO_ROOT/infra"
CONTRACTS_DIR="$REPO_ROOT/contracts"

# Load agent env for private key + addresses
if [[ -f "$REPO_ROOT/agent/.env" ]]; then
  set -a; source "$REPO_ROOT/agent/.env"; set +a
fi

: "${AGENT_PRIVATE_KEY:?Need AGENT_PRIVATE_KEY in agent/.env}"
: "${USDC_ADDRESS:=0x3600000000000000000000000000000000000000}"

export USDC_ADDRESS
export AGENT_ADDRESS="${AGENT_ADDRESS:-$(cast wallet address "$AGENT_PRIVATE_KEY")}"
export RESOLVER_ADDRESS="${RESOLVER_ADDRESS:-$AGENT_ADDRESS}"
ARC_RPC="${ARC_RPC_URL:-https://rpc.testnet.arc.network}"

echo "Deploying to Arc Testnet ($ARC_RPC) ..."
echo "  Deployer: $AGENT_ADDRESS"

cd "$CONTRACTS_DIR"

BROADCAST_OUT=$(forge script script/Deploy.s.sol \
  --rpc-url "$ARC_RPC" \
  --private-key "$AGENT_PRIVATE_KEY" \
  --broadcast \
  --priority-gas-price 20000000000 \
  2>&1)

echo "$BROADCAST_OUT"

MARKET_REGISTRY=$(echo "$BROADCAST_OUT" | grep "MarketRegistry:" | awk '{print $2}')
TRACE_REGISTRY=$(echo "$BROADCAST_OUT"  | grep "TraceRegistry:"  | awk '{print $2}')

if [[ -z "$MARKET_REGISTRY" || -z "$TRACE_REGISTRY" ]]; then
  echo "ERROR: could not parse deployed addresses from forge output" >&2
  exit 1
fi

echo ""
echo "Deployed:"
echo "  MarketRegistry: $MARKET_REGISTRY"
echo "  TraceRegistry:  $TRACE_REGISTRY"

# Write deployed.json
DEPLOYED_JSON="$INFRA_DIR/deployed.json"
python3 - <<PYEOF
import json, datetime
data = {
  "chainId": 5042002,
  "network": "arc-testnet",
  "deployedAt": datetime.date.today().isoformat(),
  "contracts": {
    "MarketRegistry": "$MARKET_REGISTRY",
    "TraceRegistry":  "$TRACE_REGISTRY",
    "USDC":           "$USDC_ADDRESS"
  },
  "roles": {
    "deployer": "$AGENT_ADDRESS",
    "agent":    "$AGENT_ADDRESS",
    "resolver": "$RESOLVER_ADDRESS"
  }
}
with open("$DEPLOYED_JSON", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print("Wrote $DEPLOYED_JSON")
PYEOF

echo ""
echo "Run 'make export-addresses' to push addresses into agent + web env files."
