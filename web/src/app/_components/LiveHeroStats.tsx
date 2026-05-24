"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface StatsData {
  totalMarkets: number;
  rugsConfirmed: number;
  totalUsdcWagered: string;
}

function useCountUp(target: number, duration = 1400) {
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

function formatUsdc(raw: string): string {
  if (!raw || raw === "0") return "$0";
  const n = BigInt(raw);
  const whole = n / 1_000_000n;
  if (whole >= 1_000_000n) return `$${(Number(whole) / 1_000_000).toFixed(1)}M`;
  if (whole >= 1_000n) return `$${(Number(whole) / 1_000).toFixed(1)}k`;
  return `$${whole}`;
}

export function LiveHeroStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const notified = useRef(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: StatsData) => {
        setData(d);
        if (!notified.current && d.totalMarkets > 0) {
          notified.current = true;
          toast.success("Live data synced", {
            description: `${d.totalMarkets} markets on-chain · Arc Testnet`,
            duration: 3000,
          });
        }
      })
      .catch(() => {});
  }, []);

  const markets = useCountUp(data?.totalMarkets ?? 0);
  const rugs = useCountUp(data?.rugsConfirmed ?? 0);
  const usdcLabel = data ? formatUsdc(data.totalUsdcWagered) : null;

  if (!data) {
    return (
      <div className="rj-hero__meta">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ opacity: 0.4 }}>
            <div className="rj-stat__num" style={{ background: "rgba(255,255,255,.08)", borderRadius: 6, width: 80, height: 38 }} />
            <div className="rj-stat__lab" style={{ marginTop: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, width: 100, height: 14 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rj-hero__meta">
      <div>
        <div className="rj-stat__num">{markets}</div>
        <div className="rj-stat__lab">Markets minted</div>
      </div>
      <div>
        <div className="rj-stat__num rj-red">{rugs}</div>
        <div className="rj-stat__lab">Rugs confirmed</div>
      </div>
      <div>
        <div className="rj-stat__num">{usdcLabel ?? "—"}</div>
        <div className="rj-stat__lab">USDC wagered</div>
      </div>
    </div>
  );
}
