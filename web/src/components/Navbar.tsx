"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "./WalletConnect";

const NAV_ITEMS = [
  { href: "/markets", label: "Markets" },
  { href: "/history", label: "History" },
  { href: "/agent",   label: "Agent"   },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-sm"
      style={{ background: "rgba(31,13,25,0.92)", borderColor: "rgba(243,195,216,0.15)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-0 select-none" style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "26px", lineHeight: 1, color: "var(--foreground)" }}>
            Rug<span style={{ fontStyle: "italic", color: "var(--primary)" }}>jeez</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={
                  pathname === item.href
                    ? { background: "rgba(255,95,162,0.12)", color: "var(--primary)" }
                    : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <WalletConnectButton />
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden flex items-center gap-0.5 px-4 pb-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              pathname === item.href
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={
              pathname === item.href
                ? { background: "rgba(255,95,162,0.12)", color: "var(--primary)" }
                : undefined
            }
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
