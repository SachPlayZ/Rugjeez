"use client";

import { useState, useEffect } from "react";
import { fetchLeaderboard, getAllMarketEvents, type LeaderboardEntry } from "@/lib/markets";
import { formatUsdc } from "@/lib/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { explorerAddress } from "@/lib/arc";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const RANK_COLORS = ["text-yellow-400", "text-slate-300", "text-orange-400"];

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllMarketEvents()
      .then((events) => fetchLeaderboard(events.map((e) => e.market)))
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        No bets placed yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry, i) => {
        const isPositive = entry.pnl > 0n;
        const isNegative = entry.pnl < 0n;
        return (
          <div
            key={entry.address}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card"
          >
            <span
              className={cn(
                "font-mono text-sm font-semibold w-6 text-center shrink-0",
                RANK_COLORS[i] ?? "text-muted-foreground"
              )}
            >
              {i + 1}
            </span>
            <a
              href={explorerAddress(entry.address)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-muted-foreground hover:text-primary flex items-center gap-1 flex-1 min-w-0"
            >
              {shortAddr(entry.address)}
              <ExternalLink className="size-3 shrink-0" />
            </a>
            <div className="flex items-center gap-4 shrink-0 text-xs font-mono tabular-nums">
              <span className="text-muted-foreground hidden sm:inline">
                {formatUsdc(entry.wagered)} in
              </span>
              <span
                className={cn(
                  "font-semibold",
                  isPositive ? "text-no" : isNegative ? "text-yes" : "text-muted-foreground"
                )}
              >
                {isPositive ? "+" : ""}
                {formatUsdc(entry.pnl)} USDC
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
