"use client";

import { cn } from "@/lib/utils";
import { calcOdds } from "@/lib/markets";

interface OddsDisplayProps {
  yesPool: bigint;
  noPool: bigint;
  size?: "sm" | "md" | "lg";
  showBar?: boolean;
  className?: string;
}

export function OddsDisplay({
  yesPool,
  noPool,
  size = "md",
  showBar = true,
  className,
}: OddsDisplayProps) {
  const { yesPct, noPct } = calcOdds(yesPool, noPool);

  const labelClass = cn(
    "font-mono tabular-nums font-semibold",
    size === "sm" && "text-xs",
    size === "md" && "text-sm",
    size === "lg" && "text-base"
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(labelClass, "text-yes")}>{yesPct.toFixed(1)}%</span>
          <span className="text-muted-foreground text-xs">YES (rug)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">NO (safe)</span>
          <span className={cn(labelClass, "text-no")}>{noPct.toFixed(1)}%</span>
        </div>
      </div>
      {showBar && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-yes transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
