"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "./WalletConnect";
import { Zap } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Markets" },
  { href: "/history", label: "History" },
  { href: "/agent", label: "Agent" },
  { href: "/demo", label: "Demo" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading font-semibold text-base tracking-tight"
          >
            <div className="size-7 rounded flex items-center justify-center bg-primary text-primary-foreground">
              <Zap className="size-4" />
            </div>
            <span>Rugjeez</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded text-sm transition-colors",
                  pathname === item.href
                    ? "text-foreground bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <WalletConnectButton />
      </div>
      {/* Mobile nav */}
      <div className="sm:hidden flex items-center gap-0.5 px-4 pb-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1 rounded text-xs transition-colors",
              pathname === item.href
                ? "text-foreground bg-muted/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
