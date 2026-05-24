"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StatusFooter } from "@/components/StatusFooter";
import { WalletProvider } from "@/components/WalletConnect";
import { TraceViewer } from "@/components/TraceViewer";
import { BetSheet } from "@/components/BetSheet";
import { OddsDisplay } from "@/components/OddsDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMarketDetail, timeUntil, type MarketInfo } from "@/lib/markets";
import { formatUsdc, TRACE_REGISTRY_ADDRESS, TraceRegistryAbi } from "@/lib/contracts";
import { publicClient } from "@/lib/arc";
import { readContract } from "viem/actions";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
} from "lucide-react";
import { explorerAddress, explorerTx } from "@/lib/arc";
import { cn } from "@/lib/utils";

interface TraceData {
  ipfsCid: string;
  signature: `0x${string}`;
}

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const marketAddress = address as `0x${string}`;

  const [market, setMarket] = useState<MarketInfo | null>(null);
  const [trace, setTrace] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betOpen, setBetOpen] = useState(false);

  useEffect(() => {
    getMarketDetail(marketAddress)
      .then(async (marketData) => {
        setMarket(marketData);
        const result = await readContract(publicClient, {
          address: TRACE_REGISTRY_ADDRESS,
          abi: TraceRegistryAbi,
          functionName: "getTrace",
          args: [marketData.traceHash],
        }).catch(() => null);
        if (result) {
          const [ipfsCid, signature] = result as [string, `0x${string}`, bigint];
          if (ipfsCid) setTrace({ ipfsCid, signature });
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load market");
      })
      .finally(() => setLoading(false));
  }, [marketAddress]);

  const isOpen = market?.state === 0;
  const isCancelled = market?.state === 2;
  const isResolved = market?.state === 1;
  const bettingClosed =
    market && Date.now() / 1000 > Number(market.bettingClosesAt);

  return (
    <WalletProvider>
      <div className="flex flex-col min-h-dvh">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Back */}
          <div className="mb-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              All Markets
            </Link>
          </div>

          {loading && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-72" />
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {market && (
            <div className="flex flex-col gap-8">
              {/* Header */}
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
                        ${market.tokenSymbol}
                      </h1>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs uppercase"
                      >
                        {market.tokenChain}
                      </Badge>
                      {isResolved && (
                        <Badge
                          className={cn(
                            "gap-1 border",
                            market.resolvedYes
                              ? "bg-yes/10 text-yes border-yes/20"
                              : "bg-no/10 text-no border-no/20"
                          )}
                        >
                          {market.resolvedYes ? (
                            <>
                              <AlertTriangle className="size-3" /> Rugged
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-3" /> Safe
                            </>
                          )}
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="size-3" /> Cancelled
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Will ${market.tokenSymbol} lose &gt;
                      {Number(market.thresholdBps) / 100}% within 7 days of this
                      market opening?
                    </p>
                  </div>
                  {isOpen && !bettingClosed && (
                    <Button
                      onClick={() => setBetOpen(true)}
                      className="gap-2 shrink-0"
                    >
                      Place Bet
                    </Button>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-border/60 bg-card">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      {isOpen ? (
                        <>
                          <Clock className="size-3.5 text-primary" />
                          {timeUntil(market.resolvesAt)}
                        </>
                      ) : isResolved ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-no" />
                          Resolved
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3.5 text-muted-foreground" />
                          Cancelled
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-border/60 bg-card">
                    <span className="text-xs text-muted-foreground">Total Pool</span>
                    <span className="text-sm font-mono font-semibold tabular-nums">
                      {formatUsdc(market.yesPool + market.noPool)} USDC
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-border/60 bg-card">
                    <span className="text-xs text-muted-foreground">Baseline Price</span>
                    <span className="text-sm font-mono font-semibold tabular-nums">
                      $
                      {(Number(market.baselinePrice) / 1e8).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 6 }
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-border/60 bg-card">
                    <span className="text-xs text-muted-foreground">Threshold</span>
                    <span className="text-sm font-mono font-semibold tabular-nums">
                      -{Number(market.thresholdBps) / 100}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Odds */}
              <div className="flex flex-col gap-3 p-5 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-sm font-semibold">
                    Current Odds
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="size-3 text-yes" />
                      YES: {formatUsdc(market.yesPool)} USDC
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="size-3 text-no" />
                      NO: {formatUsdc(market.noPool)} USDC
                    </span>
                  </div>
                </div>
                <OddsDisplay
                  yesPool={market.yesPool}
                  noPool={market.noPool}
                  size="lg"
                />
              </div>

              <Separator className="opacity-30" />

              {/* Trace */}
              <div>
                <h2 className="font-heading text-lg font-semibold mb-4">
                  AI Reasoning
                </h2>
                {trace ? (
                  <TraceViewer
                    ipfsCid={trace.ipfsCid}
                    traceHash={market.traceHash}
                    agentSignature={trace.signature}
                  />
                ) : (
                  <div className="p-4 rounded-lg border border-border/60 bg-card text-sm text-muted-foreground">
                    Reasoning trace not yet available.
                  </div>
                )}
              </div>

              <Separator className="opacity-30" />

              {/* On-chain links */}
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  On-Chain
                </h2>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={explorerAddress(marketAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <CircleDollarSign className="size-3" />
                    Market Contract
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {market && (
            <BetSheet
              market={market}
              open={betOpen}
              onClose={() => setBetOpen(false)}
              onBetPlaced={() => {
                getMarketDetail(marketAddress).then(setMarket).catch(() => {});
              }}
            />
          )}
        </main>
        <StatusFooter />
      </div>
    </WalletProvider>
  );
}
