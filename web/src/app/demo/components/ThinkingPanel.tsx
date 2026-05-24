"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Zap } from "lucide-react";

const STEPS = [
  "Fetching signal from NFI blacklist…",
  "Scoring token across signal sources…",
  "Reasoning with Groq Qwen3-32B…",
  "Generating reasoning trace JSON…",
  "Computing SHA-256 trace hash…",
  "Pinning trace to IPFS via Pinata…",
  "Approving USDC seed liquidity…",
  "Calling MarketRegistry.createMarket()…",
  "Recording trace hash on TraceRegistry…",
  "Awaiting Arc block confirmation…",
] as const;

// 10 steps × 700ms = 7s — matches real agent latency (5-8s)
export const STEP_INTERVAL_MS = 700;
export const TOTAL_STEPS = STEPS.length;

interface ThinkingPanelProps {
  currentStep: number;
  done: boolean;
  symbol?: string;
}

export function ThinkingPanel({ currentStep, done, symbol }: ThinkingPanelProps) {
  return (
    <div className="p-5 rounded-xl border border-primary/25 bg-primary/5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        {done ? (
          <div className="size-6 rounded-full bg-no/20 border border-no/30 flex items-center justify-center">
            <CheckCircle2 className="size-3.5 text-no" />
          </div>
        ) : (
          <div className="size-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Loader2 className="size-3.5 text-primary animate-spin" />
          </div>
        )}
        <div>
          <p className="font-heading text-sm font-semibold">
            {done
              ? "Market minted — redirecting…"
              : symbol
              ? `Agent reasoning about $${symbol}`
              : "Agent is reasoning…"}
          </p>
          {!done && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ~8 seconds on Arc Testnet
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-border/60 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{
            width: done
              ? "100%"
              : `${Math.min((currentStep / (TOTAL_STEPS - 1)) * 100, 95)}%`,
          }}
        />
      </div>

      {/* Step list */}
      <div className="flex flex-col gap-1.5">
        {STEPS.map((step, i) => {
          const isPast = i < currentStep;
          const isCurrent = i === currentStep && !done;
          const isFuture = i > currentStep && !done;

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2.5 text-xs transition-all duration-300",
                isPast || done ? "text-muted-foreground" : "",
                isCurrent ? "text-foreground font-medium" : "",
                isFuture ? "text-muted-foreground/30" : ""
              )}
            >
              {isPast || done ? (
                <CheckCircle2 className="size-3 text-no shrink-0 opacity-70" />
              ) : isCurrent ? (
                <Zap className="size-3 text-primary shrink-0 animate-pulse" />
              ) : (
                <div className="size-3 rounded-full border border-border/30 shrink-0" />
              )}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
