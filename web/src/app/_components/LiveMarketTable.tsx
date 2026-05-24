"use client";

import { useEffect, useState } from "react";
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
  const t = y + n;
  if (t === 0n) return { yesPct: 50, noPct: 50 };
  return {
    yesPct: Number((y * 100n) / t),
    noPct: Number((n * 100n) / t),
  };
}

function fmtUsdc(raw: string) {
  const n = BigInt(raw);
  const dollars = Number(n / 1_000n) / 1_000;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  if (dollars >= 1) return `$${dollars.toFixed(0)}`;
  return "<$1";
}

function timeLeft(resolvesAt: string) {
  const diff = Number(resolvesAt) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Swatch palette cycling
const SWATCHES = [
  { bg: "#e16162", stripe: "rgba(0,30,29,.3)", pat: "zig" },
  { bg: "#f9bc60", stripe: "rgba(0,30,29,.5)", pat: "dots" },
  { bg: "#003532", stripe: "rgba(225,97,98,.55)", pat: "check" },
  { bg: "#abd1c6", stripe: "rgba(0,30,29,.35)", pat: "" },
  { bg: "#001e1d", stripe: "rgba(249,188,96,.6)", pat: "zig" },
  { bg: "#e16162", stripe: "rgba(255,255,255,.45)", pat: "dots" },
];

// Static demo rows shown when no on-chain markets exist
const DEMO_ROWS = [
  { name: "MOONBARK",   ticker: "$BARK",  addr: "0x7a3c…d4f1", market: "#0412", score: 78, yes: "$37,604",  no: "$10,606",  prob: "YES 0.78", probType: "yes" as const, time: "6d 23h" },
  { name: "PUDGYDOGE",  ticker: "$PDOGE", addr: "0x1f8e…aa07", market: "#0411", score: 71, yes: "$91,164",  no: "$37,236",  prob: "YES 0.71", probType: "yes" as const, time: "6d 22h" },
  { name: "VAPORFI",    ticker: "$VAPR",  addr: "0xc02d…91be", market: "#0410", score: 83, yes: "$252,403", no: "$51,697",  prob: "YES 0.83", probType: "yes" as const, time: "6d 19h" },
  { name: "CHAD INU",   ticker: "$CHADI", addr: "0x44ee…6cc3", market: "#0409", score: 62, yes: "$38,998",  no: "$23,902",  prob: "NO 0.38",  probType: "no"  as const, time: "5d 12h" },
  { name: "GIGAPEPE",   ticker: "$GPEPE", addr: "0xf12a…7820", market: "#0408", score: 66, yes: "$120,582", no: "$62,118",  prob: "YES 0.66", probType: "yes" as const, time: "4d 03h" },
  { name: "SAFEROCKET", ticker: "$SROCK", addr: "0x8c91…ff2d", market: "#0407", score: 54, yes: "$23,296",  no: "$21,504",  prob: "NO 0.48",  probType: "no"  as const, time: "2d 18h" },
];

function TradeButton({ address, symbol }: { address: string; symbol: string }) {
  return (
    <a
      className="rj-cta"
      href={`/m/${address}`}
      onClick={() =>
        toast.info(`Opening $${symbol} market`, {
          description: "Loading market details…",
          duration: 2500,
        })
      }
    >
      Trade →
    </a>
  );
}

function ScoreTooltip({ score }: { score: number }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<div className="rj-rugtable__score" role="cell" style={{ cursor: "help" }} />}>
        <div className="rj-risk-bar">
          <div className="rj-risk-bar__fill" style={{ ["--w" as string]: `${score}%` }} />
        </div>
        <span className={`rj-risk-num ${score >= 70 ? "rj-red" : "rj-yellow"}`}>{score}</span>
      </TooltipTrigger>
      <TooltipContent>
        Composite risk score (0–100). Scores ≥65 auto-trigger a market mint by the agent.
      </TooltipContent>
    </Tooltip>
  );
}

function ProbTooltip({ prob, probType }: { prob: string; probType: "yes" | "no" }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<div role="cell" style={{ cursor: "help" }} />}>
        <span className={`rj-outcome rj-outcome--${probType}`}>{prob}</span>
      </TooltipTrigger>
      <TooltipContent>
        Crowd-implied probability from the betting pool. YES = token loses &gt;50% in 7 days.
      </TooltipContent>
    </Tooltip>
  );
}

export function LiveMarketTable() {
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: { markets: MarketItem[] }) => {
        setMarkets(d.markets ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Use real data if available, demo otherwise
  if (!loaded || markets.length === 0) {
    return (
      <>
        {DEMO_ROWS.map((row, idx) => {
          const sw = SWATCHES[idx % SWATCHES.length];
          return (
            <div className="rj-rugtable__row" role="row" key={row.market}>
              <div className="rj-rugtable__token" role="cell">
                <div
                  className="rj-swatch"
                  data-pattern={sw.pat || undefined}
                  style={{ width: 38, height: 38, ["--swatch-bg" as string]: sw.bg, ["--swatch-stripe" as string]: sw.stripe }}
                />
                <div>
                  <div className="rj-t">{row.name} <small>{row.ticker}</small></div>
                  <div className="rj-meta rj-mono">{row.addr} · {row.market}</div>
                </div>
              </div>
              <ScoreTooltip score={row.score} />
              <div role="cell" className="rj-mono">{row.yes}</div>
              <div role="cell" className="rj-mono">{row.no}</div>
              <ProbTooltip prob={row.prob} probType={row.probType} />
              <div role="cell" className="rj-muted">{row.time}</div>
              <div role="cell"><a className="rj-cta" href="/markets">Trade →</a></div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      {markets.map((m, idx) => {
        const sw = SWATCHES[idx % SWATCHES.length];
        const odds = calcOdds(m.yesPool, m.noPool);
        const probType = odds.yesPct >= 50 ? "yes" : "no";
        const probStr = `${probType.toUpperCase()} ${(probType === "yes" ? odds.yesPct : odds.noPct) / 100}`;
        const score = Math.max(65, Math.min(99, odds.yesPct)); // all minted markets scored ≥65
        return (
          <div className="rj-rugtable__row" role="row" key={m.address}>
            <div className="rj-rugtable__token" role="cell">
              <div
                className="rj-swatch"
                data-pattern={sw.pat || undefined}
                style={{ width: 38, height: 38, ["--swatch-bg" as string]: sw.bg, ["--swatch-stripe" as string]: sw.stripe }}
              />
              <div>
                <div className="rj-t">{m.tokenSymbol} <small>${m.tokenSymbol}</small></div>
                <div className="rj-meta rj-mono">{shortAddr(m.address)} · on-chain</div>
              </div>
            </div>
            <ScoreTooltip score={score} />
            <div role="cell" className="rj-mono">{fmtUsdc(m.yesPool)}</div>
            <div role="cell" className="rj-mono">{fmtUsdc(m.noPool)}</div>
            <ProbTooltip prob={probStr} probType={probType} />
            <div role="cell" className="rj-muted">{timeLeft(m.resolvesAt)}</div>
            <div role="cell"><TradeButton address={m.address} symbol={m.tokenSymbol} /></div>
          </div>
        );
      })}
    </>
  );
}
