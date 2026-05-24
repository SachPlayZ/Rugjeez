"use client";

import { useEffect, useState } from "react";

interface TickerItem {
  t: string;
  p: string;
  dir: "up" | "down";
  alert: boolean;
}

const INITIAL_ITEMS: TickerItem[] = [
  { t: "AGENT",  p: "SCANNING…",     dir: "up",   alert: false },
  { t: "$BARK",  p: "-62.1%",        dir: "down",  alert: true  },
  { t: "$PDOGE", p: "-12.4%",        dir: "down",  alert: false },
  { t: "$VAPR",  p: "-28.0%",        dir: "down",  alert: true  },
  { t: "#0412",  p: "MINTED",        dir: "up",    alert: false },
  { t: "$JEET",  p: "RESOLVED YES",  dir: "down",  alert: true  },
  { t: "$GPEPE", p: "-44.6%",        dir: "down",  alert: true  },
  { t: "$WGMI",  p: "+18.0%",        dir: "up",    alert: false },
  { t: "AGENT",  p: "UPTIME 99.97%", dir: "up",    alert: false },
  { t: "$BANA",  p: "+412%",         dir: "up",    alert: false },
];

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(INITIAL_ITEMS);

  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/ticker");
        if (!res.ok) return;
        const data: { items: TickerItem[] } = await res.json();
        if (data.items?.length) setItems(data.items);
      } catch {
        // keep current items on network error
      }
    }

    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const doubled = [...items, ...items];

  return (
    <div className="rj-ticker" aria-hidden="true">
      <div className="rj-ticker__track">
        {doubled.map((item, i) => (
          <span key={i}>
            <span
              className={`rj-ticker__item${!item.alert ? " rj-ticker__item--safe" : ""}`}
            >
              <span className="rj-ticker__dot" />
              <span>{item.t}</span>
              <span
                className={`rj-ticker__pct--${item.dir === "up" ? "up" : "down"}`}
              >
                {item.p}
              </span>
            </span>
            <span className="rj-ticker__sep">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
