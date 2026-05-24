## RugOracle — infra Makefile
## Run from the repo root via `make -f infra/Makefile` or from infra/ directly.
##
## Prerequisites:
##   - forge (Foundry)  — contracts
##   - uv or pip        — Python
##   - node + npm       — Next.js
##   - vercel CLI       — web deploy
##   - cast             — address derivation (ships with Foundry)

REPO_ROOT := $(shell cd .. && pwd)
INFRA_DIR := $(REPO_ROOT)/infra

.PHONY: deploy-contracts abis export-addresses build-agent run-agent run-bot \
        dev-web build-web deploy-web seed-demo refresh-candidates status db-reset help

# ── Contracts ────────────────────────────────────────────────────────────────

deploy-contracts: ## Forge deploy + write addresses to deployed.json
	@bash $(INFRA_DIR)/deploy/deploy_contracts.sh
	@$(MAKE) -f $(INFRA_DIR)/Makefile abis
	@$(MAKE) -f $(INFRA_DIR)/Makefile export-addresses

abis: ## Export ABIs from contracts/out/ → agent + web
	@cd $(REPO_ROOT)/contracts && forge build --silent
	@bash $(INFRA_DIR)/deploy/export_abis.sh

export-addresses: ## Push addresses from deployed.json into agent/.env, web/.env.local, bot/.env
	@python3 $(INFRA_DIR)/deploy/export_addresses.py

# ── Agent ────────────────────────────────────────────────────────────────────

build-agent: ## Install agent deps and run ruff check
	@cd $(REPO_ROOT)/agent && \
	  if command -v uv >/dev/null 2>&1; then uv pip install -e ".[dev]" --quiet; \
	  else pip install -e ".[dev]" --quiet; fi
	@cd $(REPO_ROOT)/agent && ruff check agent/
	@echo "Agent build OK"

run-agent: ## Start agent process (foreground)
	@cd $(REPO_ROOT)/agent && \
	  if command -v uv >/dev/null 2>&1; then uv run python -m agent.main; \
	  else python -m agent.main; fi

# ── Bot ──────────────────────────────────────────────────────────────────────

run-bot: ## Start Telegram/Twitter bot (foreground)
	@cd $(REPO_ROOT)/bot && \
	  if command -v uv >/dev/null 2>&1; then uv run python -m bot.main; \
	  else python -m bot.main; fi

# ── Web ──────────────────────────────────────────────────────────────────────

dev-web: ## Start Next.js dev server
	@cd $(REPO_ROOT)/web && npm run dev

build-web: ## Production build of Next.js app
	@cd $(REPO_ROOT)/web && npm run build

deploy-web: build-web ## Build + deploy to Vercel
	@cd $(REPO_ROOT)/web && vercel --prod

# ── Demo / seeding ───────────────────────────────────────────────────────────

seed-demo: ## Inject 3-5 demo markets (agent must be running)
	@python3 $(INFRA_DIR)/seed/inject_demo_signals.py --count 3

refresh-candidates: ## Re-fetch NFI blacklist additions for demo page
	@cd $(REPO_ROOT)/agent && \
	  if command -v uv >/dev/null 2>&1; then uv run python -c "import asyncio; from agent.demo_loader import refresh_candidates; asyncio.run(refresh_candidates())"; \
	  else python -c "import asyncio; from agent.demo_loader import refresh_candidates; asyncio.run(refresh_candidates())"; fi

# ── Status / maintenance ─────────────────────────────────────────────────────

status: ## Print health of all services (green/yellow/red)
	@bash $(INFRA_DIR)/status/check_all.sh

db-reset: ## Wipe agent SQLite state (clean local restarts)
	@rm -f $(REPO_ROOT)/agent/agent_state.db
	@echo "agent_state.db removed"

# ── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
