#!/usr/bin/env bash
# Print health status for every RugOracle service.
# Exit code 0 = all green, 1 = any yellow/red.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -f "$REPO_ROOT/agent/.env" ]]; then
  set -a; source "$REPO_ROOT/agent/.env"; set +a
fi

AGENT_HOST="${DEMO_API_HOST:-127.0.0.1}"
AGENT_PORT="${DEMO_API_PORT:-8787}"
BOT_PORT="${BOT_HEALTH_PORT:-8788}"
WEB_URL="${NEXT_PUBLIC_AGENT_DEMO_URL:-http://localhost:3000}"

RED='\033[0;31m'
YLW='\033[1;33m'
GRN='\033[0;32m'
NC='\033[0m'

ALL_OK=0

check() {
  local name="$1"
  local url="$2"
  local response
  local http_code

  http_code=$(curl -s -o /tmp/_rugoracle_health -w "%{http_code}" --max-time 5 "$url" 2>/dev/null) || true
  [[ -z "$http_code" ]] && http_code="000"

  if [[ "$http_code" == "200" ]]; then
    local status
    status=$(python3 -c "import json,sys; d=json.load(open('/tmp/_rugoracle_health')); print(d.get('status','?'))" 2>/dev/null || echo "?")
    if [[ "$status" == "ok" ]]; then
      echo -e "  ${GRN}●${NC} $name — OK"
    else
      echo -e "  ${YLW}●${NC} $name — degraded (status=$status)"
      ALL_OK=1
    fi
    # Print interesting fields
    python3 -c "
import json, sys
try:
    d = json.load(open('/tmp/_rugoracle_health'))
    for k in ['uptime_seconds','last_signal_seen_at','last_market_minted_at','in_flight_mints','errors_last_hour']:
        if k in d:
            print(f'      {k}: {d[k]}')
except Exception:
    pass
" 2>/dev/null || true
  elif [[ "$http_code" == "000" ]]; then
    echo -e "  ${RED}●${NC} $name — unreachable ($url)"
    ALL_OK=1
  else
    echo -e "  ${YLW}●${NC} $name — HTTP $http_code ($url)"
    ALL_OK=1
  fi
}

echo ""
echo "RugOracle service health"
echo "========================"
check "Agent (demo API + health)" "http://$AGENT_HOST:$AGENT_PORT/health"
check "Bot"                        "http://127.0.0.1:$BOT_PORT/health"
check "Web (Next.js)"              "$WEB_URL"
echo ""

# Arc RPC liveness
echo -n "  Arc RPC ... "
ARC_RPC="${ARC_RPC_URL:-https://rpc.testnet.arc.network}"
BLOCK=$(curl -s --max-time 5 -X POST "$ARC_RPC" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  | python3 -c "import json,sys; print(int(json.load(sys.stdin)['result'],16))" 2>/dev/null || echo "ERR")

if [[ "$BLOCK" == "ERR" ]]; then
  echo -e "${RED}unreachable${NC}"
  ALL_OK=1
else
  echo -e "${GRN}block $BLOCK${NC}"
fi

echo ""
exit $ALL_OK
