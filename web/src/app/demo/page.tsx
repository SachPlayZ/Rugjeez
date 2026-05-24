"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusFooter } from "@/components/StatusFooter";
import { WalletProvider } from "@/components/WalletConnect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { watchNewMarkets } from "@/lib/markets";
import {
  ExternalLink,
  FlaskConical,
  Loader2,
  Zap,
  GitCommit,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEMO_API_URL =
  process.env.NEXT_PUBLIC_AGENT_DEMO_URL ?? "http://localhost:8787";
const DEMO_SECRET =
  process.env.NEXT_PUBLIC_DEMO_API_SECRET ?? "x9k2vp4z";

interface Candidate {
  id: string;
  symbol: string;
  chain: string;
  token_id: string;
  added_in_commit: string;
  added_at: string;
  commit_url?: string;
  summary: string;
}

const THINKING_STEPS = [
  "Fetching signal from NFI blacklist...",
  "Scoring token across signal sources...",
  "Reasoning with Groq Qwen3-32B...",
  "Generating trace hash...",
  "Pinning trace to IPFS...",
  "Approving USDC seed liquidity...",
  "Calling MarketRegistry.createMarket()...",
  "Recording trace hash on-chain...",
  "Awaiting Arc confirmation...",
];

const CHAIN_LABELS: Record<string, string> = {
  bsc: "BSC",
  solana: "SOL",
  ethereum: "ETH",
  base: "BASE",
};

export default function DemoPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [injecting, setInjecting] = useState<string | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [done, setDone] = useState(false);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${DEMO_API_URL}/demo-${DEMO_SECRET}/candidates`)
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates ?? []))
      .catch(() => setError("Could not reach agent. Is it running?"))
      .finally(() => setLoading(false));
  }, []);

  async function triggerInject(candidate: Candidate) {
    if (injecting) return;
    setInjecting(candidate.id);
    setThinkingStep(0);
    setDone(false);

    stepRef.current = setInterval(() => {
      setThinkingStep((s) => {
        if (s >= THINKING_STEPS.length - 1) {
          clearInterval(stepRef.current!);
          return s;
        }
        return s + 1;
      });
    }, 900);

    const unwatch = watchNewMarkets((event) => {
      if (
        event.tokenSymbol.toLowerCase() === candidate.symbol.toLowerCase() ||
        event.tokenId === candidate.token_id
      ) {
        clearInterval(stepRef.current!);
        unwatch();
        setDone(true);
        toast.success("Market minted!", {
          description: `$${event.tokenSymbol} — redirecting to market page…`,
        });
        setTimeout(() => {
          router.push(`/m/${event.market}`);
        }, 1500);
      }
    });

    try {
      await fetch(`${DEMO_API_URL}/demo-${DEMO_SECRET}/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidate.id }),
      });
    } catch (err: unknown) {
      clearInterval(stepRef.current!);
      unwatch();
      setInjecting(null);
      toast.error("Injection failed", {
        description:
          err instanceof Error ? err.message : "Could not reach agent",
      });
    }
  }

  return (
    <WalletProvider>
      <div className="flex flex-col min-h-dvh">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-5 text-primary" />
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                Demo Console
              </h1>
              <Badge
                variant="outline"
                className="text-xs border-primary/30 text-primary"
              >
                Live Agent
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              Pick a real NFI blacklist addition below, watch the agent reason about it
              and mint a prediction market live on Arc Testnet.
            </p>
          </div>

          <Separator className="opacity-30 my-6" />

          {/* Thinking panel */}
          {injecting && (
            <div className="mb-8 p-5 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-4">
                {done ? (
                  <CheckCircle2 className="size-4 text-no" />
                ) : (
                  <Loader2 className="size-4 text-primary animate-spin" />
                )}
                <h3 className="font-heading text-sm font-semibold">
                  {done ? "Market minted!" : "Agent is reasoning…"}
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {THINKING_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={cn(
                      "flex items-center gap-2.5 text-xs transition-all duration-300",
                      i < thinkingStep
                        ? "text-muted-foreground"
                        : i === thinkingStep
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/30"
                    )}
                  >
                    {i < thinkingStep ? (
                      <CheckCircle2 className="size-3 text-no shrink-0" />
                    ) : i === thinkingStep ? (
                      <Zap className="size-3 text-primary shrink-0 animate-pulse" />
                    ) : (
                      <span className="size-3 shrink-0" />
                    )}
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Candidates grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No candidates loaded. Start the agent first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex flex-col gap-3 p-4 rounded-lg border bg-card transition-all duration-200",
                    injecting === c.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 hover:border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-base">
                        ${c.symbol}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs font-mono uppercase"
                      >
                        {CHAIN_LABELS[c.chain] ?? c.chain}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.added_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {c.summary}
                  </p>

                  <div className="flex items-center justify-between gap-3 mt-auto">
                    {c.commit_url ? (
                      <a
                        href={c.commit_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
                      >
                        <GitCommit className="size-3" />
                        {c.added_in_commit.slice(0, 7)}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <GitCommit className="size-3" />
                        {c.added_in_commit.slice(0, 7)}
                      </span>
                    )}

                    <Button
                      size="sm"
                      disabled={!!injecting}
                      onClick={() => triggerInject(c)}
                      className="gap-1.5 text-xs h-7"
                    >
                      {injecting === c.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Zap className="size-3" />
                      )}
                      {injecting === c.id ? "Minting…" : "Trigger"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="opacity-30 my-8" />

          {/* Honesty footer */}
          <p className="text-xs text-muted-foreground/60 text-center leading-relaxed max-w-lg mx-auto">
            Demo mode: signals are pulled from real NFI blacklist commits. The agent reasons
            about and mints them on demand. In production, the agent processes commits
            autonomously as they happen.
          </p>
        </main>
        <StatusFooter />
      </div>
    </WalletProvider>
  );
}
