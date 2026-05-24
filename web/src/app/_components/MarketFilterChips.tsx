"use client";

import { useState } from "react";

const CHIPS = [
  { label: "All",          count: 198, key: "all"     },
  { label: "Score ≥ 80",   count: 52,  key: "high"    },
  { label: "Score 65–79",  count: 94,  key: "mid"     },
  { label: "Score 50–64",  count: 52,  key: "low"     },
  { label: "Closing <24h", count: 34,  key: "closing" },
];

export function MarketFilterChips() {
  const [active, setActive] = useState("all");
  return (
    <div className="rj-filters">
      {CHIPS.map((chip) => (
        <button
          key={chip.key}
          className={`rj-chip${active === chip.key ? " rj-on" : ""}`}
          onClick={() => setActive(chip.key)}
        >
          {chip.label}<span className="rj-chip__count">{chip.count}</span>
        </button>
      ))}
    </div>
  );
}
