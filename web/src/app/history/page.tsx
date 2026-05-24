"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusFooter } from "@/components/StatusFooter";
import { WalletProvider } from "@/components/WalletConnect";
import { MarketCard, MarketCardSkeleton } from "@/components/MarketCard";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAllMarketEvents, type MarketCreatedEvent } from "@/lib/markets";
import { History } from "lucide-react";

export default function HistoryPage() {
  const [markets, setMarkets] = useState<MarketCreatedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllMarketEvents()
      .then((events) => {
        const now = Math.floor(Date.now() / 1000);
        const resolved = events
          .filter((m) => now >= Number(m.resolvesAt))
          .sort((a, b) => Number(b.resolvesAt) - Number(a.resolvesAt));
        setMarkets(resolved);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load history")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <WalletProvider>
      <div className="flex flex-col min-h-dvh">
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <History className="size-5 text-muted-foreground" />
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Market History
            </h1>
            {!loading && (
              <Badge variant="secondary" className="font-mono text-xs">
                {markets.length} resolved
              </Badge>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No resolved markets yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Markets resolve 7 days after opening.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map((m) => (
                <MarketCard key={m.market} event={m} state={1} />
              ))}
            </div>
          )}
        </main>
        <StatusFooter />
      </div>
    </WalletProvider>
  );
}
