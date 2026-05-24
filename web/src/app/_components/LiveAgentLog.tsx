"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface AgentEvent {
  time: string;
  act: string;
  rest: string;
}

interface AgentHealth {
  status: "ok" | "offline";
  uptime_seconds?: number;
  last_market_address?: string | null;
  errors_last_hour?: number;
  in_flight_mints?: number;
  recent_events?: AgentEvent[];
}

interface DisplayLine extends AgentEvent {
  isNew: boolean;
}

function fmtUptime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

const DEMO_LINES: AgentEvent[] = [
  { time: "12:04:31", act: "scan",    rest: "$MOONBARK · score 23 · from nfi_blacklist · below threshold" },
  { time: "12:04:32", act: "scan",    rest: "$CHAD_INU · score 42 · from price_anomaly · below threshold" },
  { time: "12:04:33", act: "scan",    rest: "$VAPORFI  · score 8  · from rugjeez_blacklist · below threshold" },
  { time: "12:04:34", act: "scan",    rest: "$SAFERKT  · score 31 · from nfi_blacklist · below threshold" },
  { time: "12:05:02", act: "flag",    rest: "$BARK · score 81 · threshold crossed · minting market…" },
  { time: "12:05:04", act: "mint",    rest: "market deployed → 0x7a3c…d4f1 · $BARK" },
  { time: "12:05:05", act: "ok",      rest: "IPFS trace pinned · bafybeig…r34d" },
  { time: "12:05:18", act: "scan",    rest: "$NORMIES  · score 14 · from price_anomaly · below threshold" },
  { time: "12:05:22", act: "scan",    rest: "$WGMI     · score 52 · from nfi_blacklist · watch-listed" },
  { time: "12:05:41", act: "resolve", rest: "market 0xdef0…1a4f · YES · token rugged · drop 5813bps" },
  { time: "12:05:42", act: "ok",      rest: "winnings distributed · $57,300 USDC settled" },
  { time: "12:05:58", act: "scan",    rest: "$GIGAPEPE · score 19 · from rugjeez_blacklist · below threshold" },
  { time: "12:06:17", act: "flag",    rest: "$VAPORFI  · score 83 · threshold crossed · minting market…" },
  { time: "12:06:19", act: "mint",    rest: "market deployed → 0xc02d…91be · $VAPORFI" },
  { time: "12:06:20", act: "ok",      rest: "IPFS trace pinned · bafybeih…m7q1" },
  { time: "12:06:34", act: "scan",    rest: "$PUDGYDOGE · score 38 · from price_anomaly · below threshold" },
  { time: "12:06:51", act: "flag",    rest: "$GIGAPEPE · score 66 · threshold crossed · minting market…" },
  { time: "12:06:54", act: "mint",    rest: "market deployed → 0xf12a…7820 · $GIGAPEPE" },
];

const COLOR_MAP: Record<string, string> = {
  scan:    "#6b7e7a",
  flag:    "var(--rj-red)",
  mint:    "var(--rj-yellow)",
  resolve: "#5ee9c8",
  ok:      "var(--rj-mint)",
  err:     "var(--rj-red)",
  signal:  "var(--rj-paper)",
};

export function LiveAgentLog() {
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [lines, setLines] = useState<DisplayLine[]>([]);
  // Offline demo animation
  const [demoCount, setDemoCount] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const notified = useRef(false);
  const isFirstLoad = useRef(true);
  const seenKeys = useRef(new Set<string>());

  // Poll agent health every 5s
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agent");
        if (!res.ok) throw new Error("agent unreachable");
        const d: AgentHealth = await res.json();
        setHealth(d);

        if (!notified.current) {
          notified.current = true;
          if (d.status === "offline") {
            toast.warning("Agent offline", {
              description: "Showing demo log data",
              duration: 4000,
            });
          }
        }

        if (d.status === "ok" && d.recent_events) {
          const first = isFirstLoad.current;
          isFirstLoad.current = false;

          const processed: DisplayLine[] = d.recent_events.map((e) => {
            const key = `${e.time}:${e.act}:${e.rest}`;
            const isNew = !first && !seenKeys.current.has(key);
            seenKeys.current.add(key);
            return { ...e, isNew };
          });
          setLines(processed);
        }
      } catch {
        setHealth((prev) => prev ?? { status: "offline" });
      }
    }

    load();
    const id = setInterval(load, 5_000);
    return () => clearInterval(id);
  }, []);

  // Animate demo lines in one-by-one when offline
  useEffect(() => {
    if (health?.status === "ok") return;
    if (demoCount >= DEMO_LINES.length) return;
    const id = setTimeout(() => setDemoCount((v) => v + 1), 280);
    return () => clearTimeout(id);
  }, [demoCount, health?.status]);

  // Auto-scroll to bottom whenever lines change
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, demoCount]);

  const isOnline = health?.status === "ok";
  const uptime =
    health?.uptime_seconds != null ? fmtUptime(health.uptime_seconds) : null;

  // Build display: header status line + events
  const statusLine: DisplayLine = isOnline
    ? {
        time: nowTime(),
        act: "ok",
        rest: `agent online · uptime ${uptime ?? "—"} · ${health?.errors_last_hour ?? 0} errors/h${health?.in_flight_mints ? ` · ${health.in_flight_mints} mint in flight` : ""}`,
        isNew: false,
      }
    : {
        time: nowTime(),
        act: "err",
        rest: "AGENT OFFLINE — showing demo data",
        isNew: false,
      };

  const displayLines: DisplayLine[] =
    isOnline
      ? [statusLine, ...lines]
      : [
          ...(health !== null ? [statusLine] : []),
          ...DEMO_LINES.slice(0, demoCount).map((l) => ({ ...l, isNew: false })),
        ];

  return (
    <div className="rj-term">
      <div className="rj-term__head">
        <div className="rj-term__dots">
          <span />
          <span />
          <span />
        </div>
        <div>rugjeez-agent@arc-testnet:~ · last 60 events</div>
        <div className="rj-term__pulse">
          {isOnline
            ? `LIVE · uptime ${uptime}`
            : health
              ? "OFFLINE"
              : "CONNECTING…"}
        </div>
      </div>
      <div className="rj-term__body" ref={bodyRef}>
        {displayLines.map((line, i) => (
          <div
            className={`rj-term__line${line.isNew ? " rj-term__line--new" : ""}`}
            key={i}
          >
            <span className="rj-term__time">[{line.time}]</span>
            <span
              className={`rj-term__action ${line.act}`}
              style={{ color: COLOR_MAP[line.act] }}
            >
              {line.act.toUpperCase().padEnd(7)}
            </span>
            <span className="rj-term__rest">{line.rest}</span>
          </div>
        ))}
        <div className="rj-term__line">
          <span className="rj-cursor" />
        </div>
      </div>
    </div>
  );
}
