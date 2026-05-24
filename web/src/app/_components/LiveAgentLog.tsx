"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface AgentHealth {
  status: "ok" | "offline";
  uptime_seconds?: number;
  last_signal_seen_at?: string | null;
  last_market_minted_at?: string | null;
  last_market_address?: string | null;
  errors_last_hour?: number;
}

interface LogLine {
  time: string;
  act: string;
  rest: string;
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

const DEMO_LINES: LogLine[] = [
  { time: "12:04:31", act: "scan",    rest: "0xabc…7e21 · score 23 · below threshold" },
  { time: "12:04:32", act: "scan",    rest: "0x44ee…6cc3 · score 42 · below threshold" },
  { time: "12:04:33", act: "scan",    rest: "0xff10…3322 · score 8  · below threshold" },
  { time: "12:04:34", act: "scan",    rest: "0x9088…ddc2 · score 31 · below threshold" },
  { time: "12:05:02", act: "flag",    rest: "0xdef0…1a4f · score 81 · minting market…" },
  { time: "12:05:04", act: "mint",    rest: "market #0412 deployed at 0x7a3c…d4f1" },
  { time: "12:05:05", act: "ok",      rest: "IPFS trace pinned · bafy…r34d" },
  { time: "12:05:18", act: "scan",    rest: "0x12cd…e7f9 · score 14 · below threshold" },
  { time: "12:05:22", act: "scan",    rest: "0xaa01…0bbe · score 52 · watch-listed" },
  { time: "12:05:41", act: "resolve", rest: "market #0381 · YES wins · $57,300 distributed" },
  { time: "12:05:42", act: "ok",      rest: "oracle posted · price feed #0xchain.usdc" },
  { time: "12:05:58", act: "scan",    rest: "0x6bc3…11a0 · score 19 · below threshold" },
  { time: "12:06:17", act: "flag",    rest: "0xc02d…91be · score 83 · minting market…" },
  { time: "12:06:19", act: "mint",    rest: "market #0410 deployed at 0xc02d…91be" },
  { time: "12:06:20", act: "ok",      rest: "IPFS trace pinned · bafy…m7q1" },
  { time: "12:06:34", act: "scan",    rest: "0x3b18…c0aa · score 38 · below threshold" },
  { time: "12:06:51", act: "scan",    rest: "0xf12a…7820 · score 66 · minting market…" },
  { time: "12:06:54", act: "mint",    rest: "market #0411 deployed" },
];

const COLOR_MAP: Record<string, string> = {
  scan: "#6b7e7a",
  flag: "var(--rj-red)",
  mint: "var(--rj-yellow)",
  resolve: "#5ee9c8",
  ok: "var(--rj-mint)",
};

export function LiveAgentLog() {
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const notified = useRef(false);

  // Poll agent health
  useEffect(() => {
    function load() {
      fetch("/api/agent")
        .then((r) => r.json())
        .then((d: AgentHealth) => {
          setHealth(d);
          if (!notified.current) {
            notified.current = true;
            if (d.status === "offline") {
              toast.warning("Agent offline", { description: "Showing demo log data", duration: 4000 });
            }
          }
        })
        .catch(() => setHealth({ status: "offline" }));
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  // Animate demo lines in one by one
  useEffect(() => {
    if (visibleCount >= DEMO_LINES.length) return;
    const id = setTimeout(() => setVisibleCount((v) => v + 1), 300);
    return () => clearTimeout(id);
  }, [visibleCount]);

  // Auto-scroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [visibleCount, health]);

  const uptime = health?.uptime_seconds != null ? fmtUptime(health.uptime_seconds) : null;
  const isOnline = health?.status === "ok";

  // Build live lines from real agent data
  const liveLines: LogLine[] = [];
  if (health) {
    if (isOnline) {
      liveLines.push({ time: nowTime(), act: "ok", rest: `AGENT ONLINE · uptime ${uptime ?? "—"}` });
      if (health.last_market_address) {
        liveLines.push({
          time: health.last_market_minted_at?.slice(11, 19) ?? nowTime(),
          act: "mint",
          rest: `last market → ${health.last_market_address.slice(0, 10)}…${health.last_market_address.slice(-4)}`,
        });
      }
      if (health.errors_last_hour && health.errors_last_hour > 0) {
        liveLines.push({ time: nowTime(), act: "flag", rest: `${health.errors_last_hour} errors in last hour` });
      }
    } else {
      liveLines.push({ time: nowTime(), act: "flag", rest: "AGENT OFFLINE — demo data below" });
    }
  }

  const allLines = [...liveLines, ...DEMO_LINES.slice(0, visibleCount)];

  return (
    <div className="rj-term">
      <div className="rj-term__head">
        <div className="rj-term__dots"><span /><span /><span /></div>
        <div>rugjeez-agent@arc-testnet:~ · last 120 events</div>
        <div className="rj-term__pulse">
          {isOnline ? `LIVE · uptime ${uptime}` : health ? "OFFLINE" : "CONNECTING…"}
        </div>
      </div>
      <div className="rj-term__body" ref={bodyRef}>
        {allLines.map((line, i) => (
          <div className="rj-term__line" key={i} style={{ opacity: i < liveLines.length ? 1 : undefined }}>
            <span className="rj-term__time">[{line.time}]</span>
            <span
              className={`rj-term__action ${line.act}`}
              style={{ color: COLOR_MAP[line.act] }}
            >
              {line.act.toUpperCase()}
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
