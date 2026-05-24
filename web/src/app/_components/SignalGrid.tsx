"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WEIGHT_TIPS: Record<string, string> = {
  high: "Heavily weighted. A hit here alone can push the composite score above the 65-point mint threshold.",
  medium: "Moderately weighted. Contributes meaningfully to the final risk score.",
  low: "Lower-weight signal. Used as a tiebreaker when other primary signals are ambiguous.",
};

const SIGNALS = [
  {
    n: "01 / 07", w: "high",   name: <>NFI <em>blacklist</em></>,
    desc: "Community-curated rug list of deployers and bytecode. Direct match → instant flag.",
    src: "Community", val: "128k entries",
    tip: "The NostalgiaForInfinity blacklist is one of the most comprehensive community-maintained rug databases. A direct address or bytecode match is an automatic high-severity signal.",
  },
  {
    n: "02 / 07", w: "high",   name: <>Liquidity <em>lock</em></>,
    desc: "Is the LP locked, vested, or removable? Unlocked pools are the strongest pre-rug signal.",
    src: "On-chain", val: "5 lockers",
    tip: "If the LP tokens are not locked in a locker contract, the deployer can remove all liquidity instantly. This is the single most reliable pre-rug indicator.",
  },
  {
    n: "03 / 07", w: "medium", name: <>Holder concentration</>,
    desc: "Top 10 wallets' share of supply. Above 70% means a coordinated dump can drain the market.",
    src: "On-chain", val: "Top-10 %",
    tip: "Concentration above 70% means a few wallets can coordinate a dump that wipes out retail holders. Tracked via on-chain holder data.",
  },
  {
    n: "04 / 07", w: "high",   name: <>Deployer <em>history</em></>,
    desc: "Has this wallet — or any wallet funding it within 3 hops — shipped a token that rugged before?",
    src: "Indexer", val: "3-hop graph",
    tip: "Serial ruggers reuse infrastructure. The agent walks the funding graph 3 hops back, flagging any previously rugged deployers in the chain.",
  },
  {
    n: "05 / 07", w: "low",    name: <>Contract age</>,
    desc: "Most rugs happen in the first 72 hours; fresh contracts get a higher weight that decays.",
    src: "On-chain", val: "Hours",
    tip: "A token deployed less than 72 hours ago gets additional risk weight. This decays exponentially as the contract ages past the high-risk window.",
  },
  {
    n: "06 / 07", w: "medium", name: <>Social <em>velocity</em></>,
    desc: "Sudden mention spike with no product, audit, or builder behind it. Textbook rug precursor.",
    src: "X · Telegram", val: "σ over baseline",
    tip: "A sudden spike in mentions (>2σ above baseline) with no organic developer activity is a classic sign of manufactured hype designed to exit into retail buyers.",
  },
  {
    n: "07 / 07", w: "medium", name: <>Trading anomalies</>,
    desc: "Wash trading, circular flow between linked wallets, bot-only volume that vanishes on cue.",
    src: "On-chain", val: "Pattern match",
    tip: "The agent detects circular token flows between related wallets, wash-trading patterns that inflate volume, and bot-only activity that precedes a dump.",
  },
];

export function SignalGrid() {
  return (
    <div className="rj-signal-grid">
      {SIGNALS.map((sig) => (
        <article className="rj-signal" key={sig.n}>
          <div className="rj-signal__head">
            <span className="rj-signal__num">{sig.n}</span>
            <Tooltip>
              <TooltipTrigger render={<span className={`rj-signal__weight${sig.w === "low" ? " rj-signal__weight--low" : sig.w === "high" ? " rj-signal__weight--high" : ""}`} style={{ cursor: "help" }} />}>
                {sig.w === "low" ? "Low" : sig.w === "high" ? "High" : "Medium"}
              </TooltipTrigger>
              <TooltipContent side="top">
                <strong>{sig.w === "high" ? "High weight" : sig.w === "medium" ? "Medium weight" : "Low weight"}:</strong>{" "}
                {WEIGHT_TIPS[sig.w]}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="rj-signal__name">{sig.name}</div>
          <Tooltip>
            <TooltipTrigger render={<p className="rj-signal__desc" style={{ cursor: "help" }} />}>
              {sig.desc}
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start">
              {sig.tip}
            </TooltipContent>
          </Tooltip>
          <div className="rj-signal__foot">
            <span>{sig.src}</span>
            <span className="rj-src">{sig.val}</span>
          </div>
        </article>
      ))}

      {/* Composite card */}
      <article className="rj-signal" style={{ background: "linear-gradient(180deg,rgba(249,188,96,.06),var(--rj-ink))", borderColor: "rgba(249,188,96,.3)" }}>
        <div className="rj-signal__head">
          <span className="rj-signal__num">∑</span>
          <Tooltip>
            <TooltipTrigger render={<span className="rj-signal__weight" style={{ cursor: "help" }} />}>
              Aggregated
            </TooltipTrigger>
            <TooltipContent>
              Weighted sum of all seven signals, normalized to 0–100. Score ≥65 = market minted automatically.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="rj-signal__name" style={{ color: "var(--rj-yellow)" }}>
          Composite <em style={{ color: "var(--rj-paper)" }}>score</em>
        </div>
        <p className="rj-signal__desc">
          All seven signals normalized and weighted. Anything above <b style={{ color: "var(--rj-paper)" }}>65</b> auto-mints a market.
        </p>
        <div className="rj-signal__foot">
          <span>Threshold</span>
          <Tooltip>
            <TooltipTrigger render={<span className="rj-src" style={{ color: "var(--rj-yellow)", cursor: "help" }} />}>
              ≥ 65 / 100
            </TooltipTrigger>
            <TooltipContent>
              The agent mints a market the instant any token&apos;s composite score crosses 65. No human approval needed.
            </TooltipContent>
          </Tooltip>
        </div>
      </article>
    </div>
  );
}
