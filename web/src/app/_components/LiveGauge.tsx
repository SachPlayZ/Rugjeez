"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarketItem {
  address: string;
  tokenSymbol: string;
  yesPool: string;
  noPool: string;
  resolvesAt: string;
  state: number;
  resolvedYes: boolean;
  createdAt: string;
}

function calcOdds(yes: string, no: string) {
  const y = BigInt(yes);
  const n = BigInt(no);
  const total = y + n;
  if (total === 0n) return { yesPct: 50, noPct: 50 };
  const pct = Number((y * 100n) / total);
  return { yesPct: pct, noPct: 100 - pct };
}

function timeAgo(createdAt: string) {
  const secs = Math.floor(Date.now() / 1000) - Number(createdAt);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

// Demo fallback if no on-chain markets
const DEMO = {
  tokenSymbol: "MOONBARK",
  yesPool: "37604000000",
  noPool: "10606000000",
  createdAt: String(Math.floor(Date.now() / 1000) - 120),
  marketNum: "#0412",
  score: 78,
};

export function LiveGauge() {
  const [market, setMarket] = useState<MarketItem | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const prevAddr = useRef<string | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/stats")
        .then((r) => r.json())
        .then((d: { markets: MarketItem[]; totalMarkets: number }) => {
          const latest = d.markets?.[0] ?? null;
          if (latest) {
            if (prevAddr.current && prevAddr.current !== latest.address) {
              toast("New market minted", {
                description: `$${latest.tokenSymbol} flagged by agent`,
                duration: 5000,
              });
            }
            prevAddr.current = latest.address;
            setMarket(latest);
            setIsDemo(false);
          } else {
            setIsDemo(true);
          }
        })
        .catch(() => setIsDemo(true));
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const src = isDemo ? DEMO : market;
  const symbol = src?.tokenSymbol ?? "—";
  const odds = src ? calcOdds(src.yesPool, src.noPool) : { yesPct: 78, noPct: 22 };
  const ago = src ? timeAgo(src.createdAt) : "2 min ago";
  const fillPct = Math.max(odds.yesPct, 40); // visual floor

  return (
    <aside className="rj-gauge">
      <Tooltip>
        <TooltipTrigger render={<div className="rj-gauge__pin" style={{ cursor: "help" }} />}>
          MARKET<br />MINTED
          <small>{ago.toUpperCase()}</small>
        </TooltipTrigger>
        <TooltipContent side="left">
          The AI agent automatically minted this market after the rug score crossed 65.
        </TooltipContent>
      </Tooltip>

      <div className="rj-gauge__head">
        <span className="rj-gauge__title">
          <span className="rj-dot rj-dot--yellow" />
          Agent read · {isDemo ? "demo" : "live"}
        </span>
        <span className="rj-gauge__live">
          <span className="rj-dot" />Streaming
        </span>
      </div>

      <div className="rj-gauge__token">
        <div className="rj-name">
          {symbol}
          <span>${symbol} · {isDemo ? "4hr old" : "chain"}</span>
        </div>
        <div className="rj-price">
          {odds.yesPct >= 50 ? `−${odds.yesPct.toFixed(0)}% implied` : `+${odds.noPct.toFixed(0)}% safe`}
        </div>
      </div>

      <div className="rj-gauge__bar-wrap">
        <div className="rj-gauge__bar">
          <div className="rj-gauge__bar-fill" style={{ width: `${fillPct}%` }} />
        </div>
        <div className="rj-gauge__bar-marker" style={{ left: `${fillPct}%` }} />
        <div className="rj-gauge__bar-num">
          {fillPct}<small>/100 risk</small>
        </div>
      </div>

      <div className="rj-gauge__scale">
        <span>Safe</span><span>Watch</span><span>Threshold ↑</span>
      </div>

      <div className="rj-gauge__verdict">
        <div className="rj-verdict">&ldquo;Threshold crossed.&rdquo;</div>
        <div className="rj-stake">
          Market <b>{isDemo ? "#0412" : `#${String((market as MarketItem | null)?.address ?? "").slice(2, 6) || "—"}`}</b> · 7d window
        </div>
      </div>

      <div className="rj-gauge__odds">
        <Tooltip>
          <TooltipTrigger render={<button className="rj-odd rj-odd--rug" />}>
            <span className="rj-lab">YES · loses &gt;50%</span>
            <span className="rj-num">{(odds.yesPct / 100).toFixed(2)}</span>
          </TooltipTrigger>
          <TooltipContent>
            Crowd-implied probability that this token loses &gt;50% in 7 days. Bet YES to agree.
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={<button className="rj-odd rj-odd--safe" />}>
            <span className="rj-lab">NO · holds value</span>
            <span className="rj-num">{(odds.noPct / 100).toFixed(2)}</span>
          </TooltipTrigger>
          <TooltipContent>
            Crowd-implied probability the token holds value (&lt;50% loss). Bet NO to disagree.
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
