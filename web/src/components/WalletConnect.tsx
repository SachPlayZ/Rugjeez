"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import type { SmartAccount, P256Credential } from "viem/account-abstraction";
import {
  loadCredential,
  saveCredential,
  clearCredential,
  loginPasskey,
  registerPasskey,
  getSmartAccount,
  useUsdcBalance,
} from "@/lib/wallets";
import { formatUsdc } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Fingerprint, LogOut, Copy, Check, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import { explorerTx } from "@/lib/arc";

interface WalletContextValue {
  account: SmartAccount | null;
  address: `0x${string}` | null;
  connecting: boolean;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  account: null,
  address: null,
  connecting: false,
  connected: false,
  connect: () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<SmartAccount | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const cred = loadCredential();
    if (cred) {
      getSmartAccount(cred)
        .then(setAccount)
        .catch(() => clearCredential());
    }
  }, []);

  const connect = () => setShowDialog(true);
  const disconnect = () => {
    clearCredential();
    setAccount(null);
    toast.info("Wallet disconnected");
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        address: account?.address ?? null,
        connecting,
        connected: !!account,
        connect,
        disconnect,
      }}
    >
      {children}
      <WalletDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onConnected={(acc) => {
          setAccount(acc);
          setShowDialog(false);
        }}
        setConnecting={setConnecting}
      />
    </WalletContext.Provider>
  );
}

function WalletDialog({
  open,
  onClose,
  onConnected,
  setConnecting,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (acc: SmartAccount) => void;
  setConnecting: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setConnecting(true);
    try {
      let cred: P256Credential;
      if (mode === "register") {
        if (!username.trim()) {
          toast.error("Enter a username");
          return;
        }
        cred = await registerPasskey(username.trim());
      } else {
        cred = await loginPasskey();
      }
      const acc = await getSmartAccount(cred);
      onConnected(acc);
      toast.success("Wallet connected", {
        description: `${acc.address.slice(0, 6)}...${acc.address.slice(-4)}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Wallet connect failed";
      if (msg.includes("NotAllowedError") || msg.includes("cancelled")) {
        toast.error("Passkey cancelled");
      } else {
        toast.error("Connection failed", { description: msg });
      }
    } finally {
      setLoading(false);
      setConnecting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Connect Wallet</DialogTitle>
          <DialogDescription>
            Use a passkey to access your Circle smart account. Gas is sponsored.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "login" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("login")}
            >
              Sign In
            </Button>
            <Button
              variant={mode === "register" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("register")}
            >
              Register
            </Button>
          </div>

          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-xs">
                Username
              </Label>
              <Input
                id="username"
                placeholder="alice"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="h-9 text-sm"
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            {loading
              ? "Authenticating..."
              : mode === "register"
              ? "Create Passkey"
              : "Sign in with Passkey"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            No seed phrase. No password. Biometric only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddressCopy({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      title="Copy address"
    >
      {address.slice(0, 6)}...{address.slice(-4)}
      {copied ? (
        <Check className="size-3 text-no" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  );
}

const FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const faucetCooldownKey = (address: string) => `rugjeez:faucet:${address.toLowerCase()}`;

function useFaucetCooldown(address: string | null) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    if (!address) { setExpiresAt(null); return; }
    const raw = localStorage.getItem(faucetCooldownKey(address));
    setExpiresAt(raw ? Number(raw) : null);
  }, [address]);

  const setCooldown = useCallback((address: string) => {
    const exp = Date.now() + FAUCET_COOLDOWN_MS;
    localStorage.setItem(faucetCooldownKey(address), String(exp));
    setExpiresAt(exp);
  }, []);

  const remaining = expiresAt !== null ? Math.max(0, expiresAt - Date.now()) : 0;
  const onCooldown = remaining > 0;

  return { onCooldown, remaining, setCooldown };
}

function formatCooldown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function FundButton({ address }: { address: string }) {
  const [loading, setLoading] = useState(false);
  const { onCooldown, remaining, setCooldown } = useFaucetCooldown(address);

  async function handleFund() {
    if (onCooldown || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.remaining) {
          setCooldown(address);
          toast.error("Already funded", { description: `Try again in ${formatCooldown(data.remaining)}` });
        } else {
          toast.error("Faucet failed", { description: data.error ?? "Unknown error" });
        }
        return;
      }
      setCooldown(address);
      toast.success("2 USDC sent!", {
        description: data.hash ? (
          <a href={explorerTx(data.hash)} target="_blank" rel="noopener noreferrer" className="underline">
            View transaction
          </a>
        ) : undefined,
      });
    } catch {
      toast.error("Faucet request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFund}
      disabled={onCooldown || loading}
      className="h-7 px-2 gap-1.5 text-xs"
      title={onCooldown ? `Next faucet in ${formatCooldown(remaining)}` : "Get 2 USDC testnet funds"}
      style={
        onCooldown
          ? { opacity: 0.5, cursor: "not-allowed" }
          : { borderColor: "rgba(243,195,216,0.3)", color: "var(--primary)" }
      }
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Coins className="size-3" />
      )}
      {onCooldown ? formatCooldown(remaining) : "Fund"}
    </Button>
  );
}

interface WalletConnectButtonProps {
  className?: string;
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { connected, address, connect, disconnect, connecting } = useWallet();
  const balance = useUsdcBalance(address);

  if (connecting) {
    return (
      <Button variant="outline" size="sm" disabled className={cn("gap-2", className)}>
        <Loader2 className="size-3.5 animate-spin" />
        Connecting
      </Button>
    );
  }

  if (connected && address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {balance !== null && (
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {formatUsdc(balance)} USDC
          </span>
        )}
        <AddressCopy address={address} />
        <FundButton address={address} />
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="size-7 p-0 text-muted-foreground hover:text-destructive"
          title="Disconnect"
        >
          <LogOut className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      onClick={connect}
      className={cn("gap-2", className)}
    >
      <Fingerprint className="size-3.5" />
      Connect
    </Button>
  );
}
