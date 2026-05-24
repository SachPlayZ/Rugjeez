import { Navbar } from "@/components/Navbar";
import { StatusFooter } from "@/components/StatusFooter";
import { WalletProvider } from "@/components/WalletConnect";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AGENT_ADDRESS, MARKET_REGISTRY_ADDRESS, TRACE_REGISTRY_ADDRESS } from "@/lib/contracts";
import { explorerAddress } from "@/lib/arc";
import { ExternalLink, Bot, Shield, GitBranch, Zap, Database } from "lucide-react";

const SIGNALS = [
  {
    name: "NFI Blacklist",
    author: "iterativv",
    weight: 0.5,
    description:
      "NostalgiaForInfinity (3.2k ⭐) — leading public Freqtrade strategy. Maintainer publishes a live blacklist of tokens deemed unfit to trade.",
    link: "https://github.com/iterativv/NostalgiaForInfinity",
    icon: GitBranch,
  },
  {
    name: "Price Anomaly",
    author: "On-chain DEX",
    weight: 0.3,
    description:
      "Polls DEX prices (Jupiter for Solana, Dexscreener for BSC) every 5 minutes. Sudden >20% drop in 1h triggers a signal proportional to drop magnitude.",
    icon: Zap,
  },
];

const CONTRACTS = [
  {
    name: "MarketRegistry",
    address: MARKET_REGISTRY_ADDRESS,
    description: "Factory + index. Only agent can mint markets.",
  },
  {
    name: "TraceRegistry",
    address: TRACE_REGISTRY_ADDRESS,
    description: "Stores IPFS CID → hash → agent signature on-chain.",
  },
];

export default function AgentPage() {
  return (
    <WalletProvider>
      <div className="flex flex-col min-h-dvh">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-8">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">
                  Rugjeez Agent
                </h1>
                <p className="text-sm text-muted-foreground">
                  Autonomous AI prediction market minter on Arc Testnet
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={explorerAddress(AGENT_ADDRESS)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                {AGENT_ADDRESS.slice(0, 10)}...{AGENT_ADDRESS.slice(-8)}
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* What it does */}
          <section className="flex flex-col gap-4 mb-8">
            <h2 className="font-heading text-base font-semibold">Methodology</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Rugjeez continuously watches multiple signal sources. When a flagged token
              crosses a weighted signal threshold, it scores the risk, generates a structured
              reasoning trace using Groq's Qwen3-32B model, pins the trace to IPFS, records
              the hash on-chain, and mints a binary prediction market — all within ~10 seconds
              of signal detection.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-1">
              {[
                { label: "Scoring Threshold", value: "0.6" },
                { label: "Market Duration", value: "7 days" },
                { label: "Seed Liquidity", value: "2 USDC" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col gap-0.5 p-3 rounded-lg border border-border/60 bg-card"
                >
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="font-mono font-semibold text-sm tabular-nums">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <Separator className="opacity-30 mb-8" />

          {/* Signals */}
          <section className="flex flex-col gap-4 mb-8">
            <h2 className="font-heading text-base font-semibold">Signal Sources</h2>
            <div className="flex flex-col gap-3">
              {SIGNALS.map((sig) => (
                <div
                  key={sig.name}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border/60 bg-card"
                >
                  <div className="size-8 rounded bg-muted/60 flex items-center justify-center shrink-0">
                    <sig.icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{sig.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          by {sig.author}
                        </Badge>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        weight={sig.weight}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sig.description}
                    </p>
                    {sig.link && (
                      <a
                        href={sig.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                      >
                        {sig.link.replace("https://", "")}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator className="opacity-30 mb-8" />

          {/* Contracts */}
          <section className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              <h2 className="font-heading text-base font-semibold">Contracts</h2>
              <Badge variant="outline" className="text-xs">Arc Testnet</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {CONTRACTS.map((c) => (
                <div
                  key={c.name}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{c.name}</span>
                      <a
                        href={explorerAddress(c.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                      >
                        {c.address.slice(0, 8)}...{c.address.slice(-6)}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator className="opacity-30 mb-8" />

          {/* Limitations */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              <h2 className="font-heading text-base font-semibold">Known Limitations</h2>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {[
                "Resolver is centralized in v1 — future: Chainlink/Pyth + permissionless challenge",
                "Token-to-address mapping is a static JSON — future: on-chain registry",
                "Signal scope: NFI + price anomaly only — Solana LP and social velocity are roadmap",
                "Testnet only. Arc mainnet is summer 2026.",
              ].map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-0.5">—</span>
                  {l}
                </li>
              ))}
            </ul>
          </section>
        </main>
        <StatusFooter />
      </div>
    </WalletProvider>
  );
}
