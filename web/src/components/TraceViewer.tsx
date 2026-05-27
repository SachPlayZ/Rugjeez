"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchTraceByCid, type ReasoningTrace } from "@/lib/ipfs";
import {
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { explorerAddress, EXPLORER_URL } from "@/lib/arc";
import { TRACE_REGISTRY_ADDRESS, AGENT_ADDRESS } from "@/lib/contracts";
import { verifyMessage } from "viem";

interface TraceViewerProps {
  ipfsCid: string;
  traceHash: `0x${string}`;
  agentSignature?: `0x${string}`;
  className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  nfi_blacklist: "NFI Blacklist",
  price_anomaly: "Price Anomaly",
  manual_demo: "Demo Signal",
  solana_lp: "LP Withdrawal",
};

const SOURCE_COLORS: Record<string, string> = {
  nfi_blacklist: "text-orange-400",
  price_anomaly: "text-red-400",
  manual_demo: "text-blue-400",
  solana_lp: "text-purple-400",
};

function VerdictBadge({ verdict }: { verdict: ReasoningTrace["verdict"] }) {
  if (verdict === "open_market")
    return (
      <Badge className="gap-1 bg-yes/10 text-yes border-yes/20 border">
        <AlertTriangle className="size-3" />
        Market Opened
      </Badge>
    );
  if (verdict === "monitor")
    return (
      <Badge className="gap-1 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 border">
        <MinusCircle className="size-3" />
        Monitoring
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-no/10 text-no border-no/20 border">
      <CheckCircle2 className="size-3" />
      Ignored
    </Badge>
  );
}

export function TraceViewer({
  ipfsCid,
  traceHash,
  agentSignature,
  className,
}: TraceViewerProps) {
  const [trace, setTrace] = useState<ReasoningTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sigStatus, setSigStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");

  useEffect(() => {
    if (!verifyOpen || !agentSignature || sigStatus !== "idle") return;
    setSigStatus("verifying");
    verifyMessage({
      address: AGENT_ADDRESS,
      message: { raw: traceHash },
      signature: agentSignature,
    })
      .then((valid) => setSigStatus(valid ? "valid" : "invalid"))
      .catch(() => setSigStatus("invalid"));
  }, [verifyOpen, agentSignature, traceHash, sigStatus]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTraceByCid(ipfsCid)
      .then((t) => {
        if (!t) setError("Could not load reasoning trace from IPFS.");
        else setTrace(t);
      })
      .catch(() => setError("Could not load reasoning trace from IPFS."))
      .finally(() => setLoading(false));
  }, [ipfsCid]);

  if (loading)
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );

  if (error)
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  if (!trace) return null;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-base font-semibold">AI Reasoning Trace</h3>
          {trace.manual_demo && (
            <Tooltip>
              <TooltipTrigger>
                <span>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <FlaskConical className="size-3" />
                    Demo
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Demo-injected signal. Real NFI blacklist data, manually triggered.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <VerdictBadge verdict={trace.verdict} />
      </div>

      {/* Confidence */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Agent Confidence</span>
          <span className="font-mono font-semibold tabular-nums">
            {(trace.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <Progress
          value={trace.confidence * 100}
          className="h-1.5"
        />
      </div>

      <Separator className="opacity-30" />

      {/* Rationale */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Rationale
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed">{trace.rationale}</p>
      </div>

      <Separator className="opacity-30" />

      {/* Evidence */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Signal Evidence
        </p>
        <div className="flex flex-col gap-2">
          {trace.evidence_summary.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border/40"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      SOURCE_COLORS[e.source] ?? "text-foreground"
                    )}
                  >
                    {SOURCE_LABELS[e.source] ?? e.source}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    w={e.weight.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {e.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market params */}
      <Separator className="opacity-30" />
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Chosen Parameters
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5 p-2.5 rounded bg-muted/30 border border-border/40">
            <span className="text-xs text-muted-foreground">Threshold</span>
            <span className="font-mono font-semibold text-sm tabular-nums">
              {trace.market_params.threshold_bps / 100}%
            </span>
          </div>
          <div className="flex flex-col gap-0.5 p-2.5 rounded bg-muted/30 border border-border/40">
            <span className="text-xs text-muted-foreground">Duration</span>
            <span className="font-mono font-semibold text-sm tabular-nums">
              {trace.market_params.duration_hours}h
            </span>
          </div>
          <div className="flex flex-col gap-0.5 p-2.5 rounded bg-muted/30 border border-border/40">
            <span className="text-xs text-muted-foreground">Seed Liq.</span>
            <span className="font-mono font-semibold text-sm tabular-nums">
              ${trace.market_params.initial_liquidity_usdc}
            </span>
          </div>
        </div>
      </div>

      {/* Verify on-chain */}
      <Separator className="opacity-30" />
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setVerifyOpen((o) => !o)}
        >
          <span className="flex items-center gap-1.5">
            <Shield className="size-3.5" />
            Verify On-Chain
          </span>
          {verifyOpen ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </Button>
        {verifyOpen && (
          <div className="flex flex-col gap-2.5 p-3 rounded-md bg-muted/20 border border-border/40 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-semibold">Trace Hash (SHA-256)</span>
              <span className="font-mono text-foreground/80 break-all">{traceHash}</span>
            </div>
            {agentSignature && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Agent Signature</span>
                  {sigStatus === "verifying" && (
                    <span className="text-muted-foreground text-xs">verifying…</span>
                  )}
                  {sigStatus === "valid" && (
                    <span className="flex items-center gap-1 text-no text-xs font-semibold">
                      <CheckCircle2 className="size-3" /> Valid
                    </span>
                  )}
                  {sigStatus === "invalid" && (
                    <span className="flex items-center gap-1 text-yes text-xs font-semibold">
                      <AlertTriangle className="size-3" /> Invalid
                    </span>
                  )}
                </div>
                <span className="font-mono text-foreground/80 break-all">
                  {agentSignature.slice(0, 66)}…
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-semibold">IPFS CID</span>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${ipfsCid}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary hover:underline flex items-center gap-1 break-all"
              >
                {ipfsCid}
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-semibold">On-Chain Record</span>
              <a
                href={explorerAddress(TRACE_REGISTRY_ADDRESS)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary hover:underline flex items-center gap-1"
              >
                TraceRegistry
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
