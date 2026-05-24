"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  uptime_seconds?: number;
  last_market_minted_at?: string;
  in_flight_mints?: number;
  errors_last_hour?: number;
}

async function fetchHealth(url: string): Promise<HealthStatus> {
  const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error("unhealthy");
  return res.json();
}

function Dot({
  status,
  label,
  detail,
}: {
  status: "ok" | "degraded" | "down" | "loading";
  label: string;
  detail?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-1.5 cursor-default">
          <div
            className={cn(
              "size-1.5 rounded-full",
              status === "loading" && "bg-muted animate-pulse",
              status === "ok" && "bg-no",
              status === "degraded" && "bg-yellow-500",
              status === "down" && "bg-destructive"
            )}
          />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </TooltipTrigger>
      {detail && <TooltipContent>{detail}</TooltipContent>}
    </Tooltip>
  );
}

export function StatusFooter() {
  const [agentStatus, setAgentStatus] = useState<HealthStatus | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);

  const agentUrl =
    process.env.NEXT_PUBLIC_AGENT_DEMO_URL ?? "http://localhost:8787";

  async function checkHealth() {
    try {
      const h = await fetchHealth(agentUrl);
      setAgentStatus(h);
    } catch {
      setAgentStatus({ status: "down" });
    } finally {
      setAgentLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30_000);
    return () => clearInterval(id);
  }, []);

  const agentDot: "ok" | "degraded" | "down" | "loading" = agentLoading
    ? "loading"
    : !agentStatus
    ? "down"
    : agentStatus.status === "ok"
    ? "ok"
    : "down";

  const agentDetail = agentStatus
    ? `Last mint: ${agentStatus.last_market_minted_at ?? "—"} · In-flight: ${agentStatus.in_flight_mints ?? 0}`
    : "Cannot reach agent";

  return (
    <footer className="w-full border-t border-border/40 py-3">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Dot
            status={agentDot}
            label="Agent"
            detail={agentDetail}
          />
          <Dot status="ok" label="Arc Testnet" detail="Chain ID 5042002" />
        </div>
        <p className="text-xs text-muted-foreground/50">
          Arc Testnet · USDC
        </p>
      </div>
    </footer>
  );
}
