"use client";

import { useWallet } from "@/components/WalletConnect";
import { Button } from "@/components/ui/button";
import { Lock, Fingerprint } from "lucide-react";

const ALLOWED = "0xbeceb31001d6c467146cd6177265c25e5408eecd";

export function DemoGate({ children }: { children: React.ReactNode }) {
  const { address, connected, connect } = useWallet();

  const allowed = connected && address?.toLowerCase() === ALLOWED;

  if (allowed) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div
        className="flex flex-col items-center gap-6 text-center max-w-sm"
        style={{ color: "var(--foreground)" }}
      >
        <div
          className="rounded-full p-5"
          style={{ background: "rgba(243,195,216,0.08)", border: "1px solid rgba(243,195,216,0.15)" }}
        >
          <Lock className="size-8" style={{ color: "var(--primary)" }} />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Demo Access Restricted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {connected
              ? "This wallet doesn't have access to the demo console."
              : "Connect the authorized wallet to access the demo console."}
          </p>
        </div>

        {!connected && (
          <Button onClick={connect} className="gap-2">
            <Fingerprint className="size-4" />
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  );
}
