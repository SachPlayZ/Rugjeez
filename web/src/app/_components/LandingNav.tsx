"use client";

import Link from "next/link";
import { useState } from "react";
import {
  TrendingDown,
  Zap,
  Activity,
  BarChart2,
  Terminal,
  HelpCircle,
  Fingerprint,
  LogOut,
  Copy,
  Check,
  Loader2,
  Send,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWallet } from "@/components/WalletConnect";
import { useUsdcBalance } from "@/lib/wallets";
import { formatUsdc } from "@/lib/contracts";

/* ── Section icon links (smooth-scroll to landing sections) ─ */

const SECTIONS = [
  { href: "#problem",  Icon: TrendingDown, label: "The Problem" },
  { href: "#how",      Icon: Zap,          label: "How It Works" },
  { href: "#signals",  Icon: Activity,     label: "Signal Stack" },
  { href: "#markets",  Icon: BarChart2,    label: "Live Markets" },
  { href: "#agent",    Icon: Terminal,     label: "Agent Log" },
  { href: "#faq",      Icon: HelpCircle,   label: "FAQ" },
];

/* ── App route links ─────────────────────────────────────── */

const APP_ROUTES = [
  { href: "/markets", label: "Markets" },
  { href: "/demo",    label: "Demo"    },
  { href: "/agent",   label: "Agent"   },
  { href: "/history", label: "History" },
];

/* ── Address copy chip ───────────────────────────────────── */

function AddressCopy({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={copy}
            className="rj-addr-chip"
          />
        }
      >
        <span className="rj-mono" style={{ fontSize: 12, color: "var(--rj-paper)" }}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        {copied
          ? <Check size={11} style={{ color: "var(--rj-yellow)" }} />
          : <Copy size={11} style={{ color: "var(--rj-mint)" }} />}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy full address"}</TooltipContent>
    </Tooltip>
  );
}

/* ── Landing wallet button ───────────────────────────────── */

function LandingWalletButton() {
  const { connected, address, connect, disconnect, connecting } = useWallet();
  const balance = useUsdcBalance(address);

  if (connecting) {
    return (
      <button className="rj-btn rj-btn--ghost" disabled style={{ height: 38, opacity: 0.7, display: "flex", alignItems: "center", gap: 8, cursor: "not-allowed" }}>
        <Loader2 size={14} className="animate-spin" />
        Connecting…
      </button>
    );
  }

  if (connected && address) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {balance !== null && (
          <span className="rj-nav__balance" style={{ fontSize: 12, fontFamily: "var(--rj-mono)", color: "var(--rj-mint)", letterSpacing: "0.04em" }}>
            {formatUsdc(balance)} USDC
          </span>
        )}
        <AddressCopy address={address} />
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={disconnect}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: 8,
                  border: "1px solid var(--rj-line2)", color: "var(--rj-mint)",
                  background: "none", cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
                }}
              />
            }
          >
            <LogOut size={13} />
          </TooltipTrigger>
          <TooltipContent>Disconnect wallet</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <button
      className="rj-btn rj-btn--solid"
      onClick={connect}
      style={{ height: 38, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 16px" }}
    >
      <Fingerprint size={15} />
      Connect
    </button>
  );
}

/* ── Floating left section nav ───────────────────────────── */

export function FloatingSectionNav() {
  return (
    <>
      <style>{`
        .rj-fsn {
          position: fixed;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 0;
        }
        .rj-fsn__tab {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 0 14px 14px 0;
          background: rgba(31, 13, 25, 0.88);
          border: 1px solid rgba(243, 195, 216, 0.22);
          border-left: none;
          color: #f3c3d8;
          text-decoration: none;
          backdrop-filter: blur(10px);
          transform: translateX(-10px);
          transition:
            transform 0.2s cubic-bezier(.34,1.56,.64,1),
            background 0.15s,
            color 0.15s,
            border-color 0.15s,
            box-shadow 0.15s;
        }
        .rj-fsn__tab:hover {
          transform: translateX(6px);
          background: rgba(255, 95, 162, 0.18);
          border-color: rgba(255, 95, 162, 0.55);
          color: #fff5fa;
          box-shadow: 3px 0 16px rgba(255, 95, 162, 0.25);
        }
        @media (max-width: 640px) { .rj-fsn { display: none; } }
      `}</style>
      <nav className="rj-fsn" aria-label="Page sections">
        {SECTIONS.map(({ href, Icon, label }) => (
          <Tooltip key={href}>
            <TooltipTrigger
              render={
                <a href={href} className="rj-fsn__tab" aria-label={label} />
              }
            >
              <Icon size={20} />
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </>
  );
}

/* ── Nav ─────────────────────────────────────────────────── */

export function LandingNav() {
  return (
    <nav className="rj-nav">
      {/* Brand */}
      <Link
        href="/"
        className="rj-brand"
        style={{ textDecoration: "none" }}
      >
        Rug<i>jeez</i><b>v0 · ARC TESTNET</b>
      </Link>

      {/* Center: app routes */}
      <div className="rj-nav__links" style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {APP_ROUTES.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{ fontSize: 14, color: "var(--rj-mint)", padding: "0 10px", transition: "color 0.15s" }}
            className="rj-nav__route"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right: Telegram + wallet */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href="https://t.me/+xdtrIy0WKv4yOWM1"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: 8,
                  border: "1px solid var(--rj-line2)", color: "var(--rj-mint)",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              />
            }
          >
            <Send size={14} />
          </TooltipTrigger>
          <TooltipContent>Join us on Telegram</TooltipContent>
        </Tooltip>
        <LandingWalletButton />
      </div>
    </nav>
  );
}
