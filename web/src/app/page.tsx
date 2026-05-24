"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusFooter } from "@/components/StatusFooter";
import { MarketCard, MarketCardSkeleton } from "@/components/MarketCard";
import { WalletProvider } from "@/components/WalletConnect";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getAllMarketEvents,
  watchNewMarkets,
  type MarketCreatedEvent,
} from "@/lib/markets";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Activity, Zap } from "lucide-react";
import { toast } from "sonner";

export default function HomePage() {
  const [markets, setMarkets] = useState<MarketCreatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unwatchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAllMarketEvents()
      .then((events) => {
        if (cancelled) return;
        setMarkets(events.slice().reverse());
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load markets");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    let retryDelay = 1000;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function subscribe() {
      try {
        const unwatch = watchNewMarkets((event) => {
          retryDelay = 1000;
          setMarkets((prev) => {
            if (prev.some((m) => m.market === event.market)) return prev;
            toast("New market opened", {
              description: `$${event.tokenSymbol} on ${event.tokenChain.toUpperCase()}`,
            });
            return [event, ...prev];
          });
        });
        unwatchRef.current = unwatch;
      } catch {
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 60_000);
          subscribe();
        }, retryDelay);
      }
    }

    subscribe();

    return () => {
      clearTimeout(retryTimeout);
      unwatchRef.current?.();
    };
  }, [loading]);

  const now = Math.floor(Date.now() / 1000);
  const openMarkets = markets.filter((m) => now < Number(m.resolvesAt));
  const closedMarkets = markets.filter((m) => now >= Number(m.resolvesAt));

  return (
    <WalletProvider>
      <div className="flex flex-col min-h-dvh">
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant="outline"
                className="gap-1.5 text-xs border-primary/30 text-primary"
              >
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Live on Arc Testnet
              </Badge>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
              AI Rug Detection Markets
            </h1>
            <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
              Autonomous AI agent mints binary prediction markets when multi-signal rug
              detection crosses threshold. Bet in USDC with sponsored gas.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Open markets */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <h2 className="font-heading text-base font-semibold">
                  Open Markets
                </h2>
                {!loading && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {openMarkets.length}
                  </Badge>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MarketCardSkeleton key={i} />
                ))}
              </div>
            ) : openMarkets.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Zap className="size-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">No open markets yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The agent is watching. Markets appear within seconds of a rug signal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {openMarkets.map((m) => (
                  <ErrorBoundary key={m.market} label={`MarketCard:${m.market.slice(0,8)}`}>
                    <MarketCard event={m} state={0} />
                  </ErrorBoundary>
                ))}
              </div>
            )}
          </section>

          {/* Recently closed */}
          {!loading && closedMarkets.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-heading text-base font-semibold text-muted-foreground">
                  Recently Closed
                </h2>
                <Badge variant="secondary" className="font-mono text-xs">
                  {closedMarkets.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {closedMarkets.slice(0, 6).map((m) => (
                  <ErrorBoundary key={m.market} label={`MarketCard:${m.market.slice(0,8)}`}>
                    <MarketCard event={m} state={1} />
                  </ErrorBoundary>
                ))}
              </div>
            </section>
          )}
        </main>
        <StatusFooter />
      </div>
    </WalletProvider>
  );
}
