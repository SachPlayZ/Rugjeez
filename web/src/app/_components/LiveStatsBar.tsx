"use client";

import { useEffect, useRef, useState } from "react";

interface StatsData {
  totalMarkets: number;
  openMarkets: number;
  rugsConfirmed: number;
  accuracy: number;
  totalUsdcWagered: string;
}

function useCountUp(target: number, duration = 1600) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

function formatUsdc(raw: string): { num: string; suffix: string } {
  if (!raw || raw === "0") return { num: "0", suffix: "" };
  const n = Number(BigInt(raw) / 1_000_000n);
  if (n >= 1_000_000) return { num: (n / 1_000_000).toFixed(1), suffix: "M" };
  if (n >= 1_000) return { num: (n / 1_000).toFixed(1), suffix: "k" };
  return { num: String(n), suffix: "" };
}

export function LiveStatsBar() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const totalMarkets = useCountUp(data?.totalMarkets ?? 0);
  const openMarkets = useCountUp(data?.openMarkets ?? 0);
  const rugsConfirmed = useCountUp(data?.rugsConfirmed ?? 0);
  const accuracy = useCountUp(data?.accuracy ?? 0);
  const usdcFmt = data ? formatUsdc(data.totalUsdcWagered) : null;
  const usdcNum = useCountUp(usdcFmt ? parseFloat(usdcFmt.num) : 0);

  const yesCount = data?.rugsConfirmed ?? 0;
  const noCount = (data?.totalMarkets ?? 0) - yesCount;
  const totalR = yesCount + noCount;
  const yesPct = totalR > 0 ? (yesCount / totalR) * 100 : 68.7;
  const noPct = 100 - yesPct;

  return (
    <section className="rj-stats" id="stats">
      <div className="rj-wrap">
        <div className="rj-stats__grid">
          <div>
            <div className="rj-stats__n">{totalMarkets}</div>
            <div className="rj-stats__l">Markets minted</div>
          </div>
          <div>
            <div className="rj-stats__n">
              {usdcNum}<i>{usdcFmt?.suffix ?? "k"}</i>
            </div>
            <div className="rj-stats__l">USDC wagered</div>
          </div>
          <div>
            <div className="rj-stats__n">{rugsConfirmed}</div>
            <div className="rj-stats__l">Rugs confirmed</div>
          </div>
          <div>
            <div className="rj-stats__n">
              {accuracy}<i>%</i>
            </div>
            <div className="rj-stats__l">Agent accuracy</div>
          </div>
          <div>
            <div className="rj-stats__n">{openMarkets}</div>
            <div className="rj-stats__l">Open right now</div>
          </div>
        </div>

        <div className="rj-split">
          <div className="rj-split__bar">
            <div className="rj-split__yes" style={{ width: `${yesPct.toFixed(1)}%` }}>
              <span>YES · rugged</span>
              <span>{yesCount} · {yesPct.toFixed(1)}%</span>
            </div>
            <div className="rj-split__no" style={{ width: `${noPct.toFixed(1)}%` }}>
              <span>NO · safe</span>
              <span>{noCount} · {noPct.toFixed(1)}%</span>
            </div>
          </div>
          <div className="rj-split__note">
            {totalR} resolved markets · {openMarkets} open · agent accuracy = % of YES-majority pools that resolved YES
          </div>
        </div>
      </div>
    </section>
  );
}
