"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { OddsDisplay } from "./OddsDisplay";
import { formatUsdc, USDC_DECIMALS } from "@/lib/contracts";
import { timeUntil, type MarketCreatedEvent, type MarketState } from "@/lib/markets";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface MarketCardProps {
  event: MarketCreatedEvent;
  state?: MarketState;
  resolvedYes?: boolean;
  liveYesPool?: bigint;
  liveNoPool?: bigint;
  className?: string;
}

const CHAIN_LABELS: Record<string, string> = {
  bsc: "BSC",
  solana: "SOL",
  ethereum: "ETH",
  base: "BASE",
};

const CHAIN_COLORS: Record<string, string> = {
  bsc: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  solana: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  ethereum: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  base: "bg-blue-600/10 text-blue-400 border-blue-600/20",
};

function StatePill({
  state,
  resolvedYes,
}: {
  state: MarketState;
  resolvedYes: boolean;
}) {
  if (state === 0) return null;
  if (state === 2)
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <XCircle className="size-3" />
        Cancelled
      </Badge>
    );
  return (
    <Badge
      className={cn(
        "gap-1 text-xs border",
        resolvedYes
          ? "bg-yes/10 text-yes border-yes/20"
          : "bg-no/10 text-no border-no/20"
      )}
    >
      {resolvedYes ? (
        <AlertTriangle className="size-3" />
      ) : (
        <CheckCircle2 className="size-3" />
      )}
      {resolvedYes ? "Rugged" : "Safe"}
    </Badge>
  );
}

export function MarketCard({
  event,
  state = 0,
  resolvedYes = false,
  liveYesPool,
  liveNoPool,
  className,
}: MarketCardProps) {
  const yesPool = liveYesPool ?? event.yesPool;
  const noPool = liveNoPool ?? event.noPool;
  const totalPool = yesPool + noPool;
  const isOpen = state === 0;
  const timeLeft = timeUntil(event.resolvesAt);
  const chainLabel = CHAIN_LABELS[event.tokenChain] ?? event.tokenChain.toUpperCase();
  const chainClass = CHAIN_COLORS[event.tokenChain] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Link href={`/m/${event.market}`} className="block group">
      <Card
        className={cn(
          "transition-all duration-200 border-border/60 bg-card hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          !isOpen && "opacity-70",
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className="font-heading text-lg tracking-tight truncate">
                ${event.tokenSymbol}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn("text-xs shrink-0 font-mono border", chainClass)}
              >
                {chainLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatePill state={state} resolvedYes={resolvedYes} />
              {isOpen && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span className="tabular-nums">{timeLeft}</span>
                </div>
              )}
            </div>
          </div>
          <CardDescription className="text-xs">
            Lose &gt;{((Number(event.thresholdBps) / 100)).toFixed(0)}% in 7 days?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <OddsDisplay yesPool={yesPool} noPool={noPool} size="sm" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger>
                <span className="tabular-nums cursor-help">
                  Pool: {formatUsdc(totalPool)} USDC
                </span>
              </TooltipTrigger>
              <TooltipContent>
                YES: {formatUsdc(yesPool)} / NO: {formatUsdc(noPool)}
              </TooltipContent>
            </Tooltip>
            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Details
              <ExternalLink className="size-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function MarketCardSkeleton() {
  return (
    <Card className="border-border/60 bg-card animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 rounded bg-muted" />
            <div className="h-4 w-10 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-3 w-40 rounded bg-muted mt-1" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-8 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
