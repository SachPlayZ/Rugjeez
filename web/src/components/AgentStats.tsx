"use client";

import { useState, useEffect } from "react";
import { getAllMarketEvents } from "@/lib/markets";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, CheckCircle2, TrendingUp } from "lucide-react";

interface Stats {
  total: number;
  active: number;
  resolved: number;
  lastMintAgo: string;
}

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STAT_ITEMS = [
  { key: "total", label: "Total Minted", icon: Activity },
  { key: "active", label: "Active Markets", icon: Clock },
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
  { key: "lastMintAgo", label: "Last Mint", icon: TrendingUp },
] as const;

export function AgentStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    getAllMarketEvents()
      .then((events) => {
        const total = events.length;
        const active = events.filter((e) => now < Number(e.resolvesAt)).length;
        const resolved = events.filter((e) => now >= Number(e.resolvesAt)).length;
        const newest = events.reduce(
          (max, e) => (e.blockNumber > max ? e.blockNumber : max),
          0n
        );
        const newestEvent = events.find((e) => e.blockNumber === newest);
        // approximate createdAt as resolvesAt minus 7 days
        const lastMintAgo = newestEvent
          ? timeAgo(Number(newestEvent.resolvesAt) - 7 * 86400)
          : "—";
        setStats({ total, active, resolved, lastMintAgo });
      })
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="flex flex-col gap-1 p-3 rounded-lg border border-border/60 bg-card"
        >
          <div className="flex items-center gap-1.5">
            <Icon className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          <span className="font-mono font-semibold text-sm tabular-nums">
            {stats[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
