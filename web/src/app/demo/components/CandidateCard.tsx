"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, GitCommit, Loader2, Zap } from "lucide-react";

export interface Candidate {
  id: string;
  symbol: string;
  chain: string;
  token_id: string;
  added_in_commit: string;
  added_at: string;
  commit_url?: string;
  summary: string;
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

interface CandidateCardProps {
  candidate: Candidate;
  isActive: boolean;
  isDisabled: boolean;
  onTrigger: (candidate: Candidate) => void;
}

export function CandidateCard({
  candidate: c,
  isActive,
  isDisabled,
  onTrigger,
}: CandidateCardProps) {
  const chainLabel = CHAIN_LABELS[c.chain] ?? c.chain.toUpperCase();
  const chainClass =
    CHAIN_COLORS[c.chain] ?? "bg-muted text-muted-foreground border-border";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-xl border bg-card transition-all duration-200",
        isActive
          ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5"
          : "border-border/60 hover:border-border hover:bg-card/80"
      )}
    >
      {/* Token + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading font-semibold text-base tracking-tight">
            ${c.symbol}
          </span>
          <Badge
            variant="outline"
            className={cn("text-xs font-mono border", chainClass)}
          >
            {chainLabel}
          </Badge>
        </div>
        <time
          className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5"
          dateTime={c.added_at}
        >
          {new Date(c.added_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground leading-relaxed flex-1">
        {c.summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        {c.commit_url ? (
          <a
            href={c.commit_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <GitCommit className="size-3" />
            {c.added_in_commit.slice(0, 7)}
            <ExternalLink className="size-2.5" />
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50 font-mono">
            <GitCommit className="size-3" />
            {c.added_in_commit.slice(0, 7)}
          </span>
        )}

        <Button
          size="sm"
          disabled={isDisabled}
          onClick={() => onTrigger(c)}
          className={cn(
            "gap-1.5 text-xs h-7 shrink-0 transition-all",
            isActive && "opacity-80"
          )}
        >
          {isActive ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Zap className="size-3" />
          )}
          {isActive ? "Minting…" : "Trigger"}
        </Button>
      </div>
    </div>
  );
}
