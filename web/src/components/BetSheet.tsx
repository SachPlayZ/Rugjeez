"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { OddsDisplay } from "./OddsDisplay";
import { useWallet } from "./WalletConnect";
import {
  formatUsdc,
  parseUsdc,
  USDC_ADDRESS,
  MIN_BET_USDC,
  MAX_BET_USDC,
} from "@/lib/contracts";
import {
  calcOdds,
  calcShares,
  type MarketInfo,
} from "@/lib/markets";
import { bundlerClient, useUsdcBalance } from "@/lib/wallets";
import { encodeFunctionData, parseUnits, type Hex } from "viem";
import { BinaryMarketAbi } from "@/lib/contracts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, TrendingDown, TrendingUp } from "lucide-react";

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

interface BetSheetProps {
  market: MarketInfo;
  open: boolean;
  onClose: () => void;
  onBetPlaced?: () => void;
}

type BetSide = "yes" | "no";
type TxStatus = "idle" | "approving" | "confirming" | "done" | "error";

export function BetSheet({ market, open, onClose, onBetPlaced }: BetSheetProps) {
  const { account, connected, connect, address } = useWallet();
  const usdcBalance = useUsdcBalance(address ?? null);
  const [side, setSide] = useState<BetSide>("yes");
  const [amountStr, setAmountStr] = useState("5");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [optimisticPlaced, setOptimisticPlaced] = useState(false);

  const amount = (() => {
    try {
      return parseUsdc(amountStr);
    } catch {
      return 0n;
    }
  })();

  const isOpen = market.state === 0;
  const bettingClosed = Date.now() / 1000 > Number(market.bettingClosesAt);
  const canBet = isOpen && !bettingClosed && amount >= MIN_BET_USDC && amount <= MAX_BET_USDC;

  const yesPool = market.yesPool;
  const noPool = market.noPool;
  const poolIn = side === "yes" ? yesPool : noPool;
  const poolOut = side === "yes" ? noPool : yesPool;
  const estimatedShares = amount > 0n ? calcShares(amount, poolIn, poolOut) : 0n;
  const { yesPct, noPct } = calcOdds(yesPool, noPool);

  function amountError(): string | null {
    if (amount < MIN_BET_USDC) return `Minimum bet: ${formatUsdc(MIN_BET_USDC)} USDC`;
    if (amount > MAX_BET_USDC) return `Maximum bet: ${formatUsdc(MAX_BET_USDC)} USDC`;
    return null;
  }

  async function placeBet() {
    if (!account || !bundlerClient) {
      connect();
      return;
    }
    if (!canBet) return;

    setTxStatus("approving");
    setOptimisticPlaced(true);

    try {
      const approveData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [market.address, amount],
      });

      const betData = encodeFunctionData({
        abi: BinaryMarketAbi,
        functionName: "bet",
        args: [side === "yes", amount],
      });

      setTxStatus("confirming");

      const hash = await bundlerClient.sendUserOperation({
        account,
        calls: [
          { to: USDC_ADDRESS, data: approveData },
          { to: market.address, data: betData },
        ],
        paymaster: true,
        maxPriorityFeePerGas: 1_000_000_000n, // Arc bundler minimum: 1 gwei
      });

      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
      });

      setTxStatus("done");
      toast.success("Bet confirmed!", {
        description: `${formatUsdc(amount)} USDC on ${side.toUpperCase()} — tx ${receipt.transactionHash.slice(0, 10)}...`,
        duration: 6000,
      });
      onBetPlaced?.();
      setTimeout(() => {
        setTxStatus("idle");
        setOptimisticPlaced(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setTxStatus("error");
      setOptimisticPlaced(false);
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Bet failed", { description: msg });
      setTimeout(() => setTxStatus("idle"), 2000);
    }
  }

  const busy = txStatus === "approving" || txStatus === "confirming";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-y-auto">
        <SheetHeader className="p-6 pb-4 border-b border-border/60">
          <SheetTitle className="font-heading">
            Bet on ${market.tokenSymbol}
          </SheetTitle>
          <SheetDescription>
            Will {market.tokenSymbol} lose &gt;{Number(market.thresholdBps) / 100}% in 7 days?
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-6 flex-1">
          {/* Optimistic pending card */}
          {optimisticPlaced && txStatus !== "done" && (
            <div className="flex items-center gap-2.5 p-3 rounded-md border border-primary/30 bg-primary/5 text-sm">
              <Loader2 className="size-4 animate-spin text-primary shrink-0" />
              <span className="text-foreground/80">
                {txStatus === "approving" ? "Approving USDC…" : "Confirming on Arc…"}
              </span>
            </div>
          )}
          {txStatus === "done" && (
            <div className="flex items-center gap-2.5 p-3 rounded-md border border-no/30 bg-no/5 text-sm">
              <CheckCircle2 className="size-4 text-no shrink-0" />
              <span>Bet placed successfully!</span>
            </div>
          )}

          {/* Side selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest">
              Your Position
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("yes")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-all",
                  side === "yes"
                    ? "border-yes bg-yes/10 text-yes"
                    : "border-border bg-card text-muted-foreground hover:border-yes/40"
                )}
              >
                <TrendingDown className="size-5" />
                <span className="font-semibold text-sm">YES — Rug</span>
                <span className="font-mono text-xs tabular-nums">{yesPct.toFixed(1)}%</span>
              </button>
              <button
                onClick={() => setSide("no")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-all",
                  side === "no"
                    ? "border-no bg-no/10 text-no"
                    : "border-border bg-card text-muted-foreground hover:border-no/40"
                )}
              >
                <TrendingUp className="size-5" />
                <span className="font-semibold text-sm">NO — Safe</span>
                <span className="font-mono text-xs tabular-nums">{noPct.toFixed(1)}%</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bet-amount" className="text-xs text-muted-foreground uppercase tracking-widest">
                Amount (USDC)
              </Label>
              {usdcBalance !== null && (
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  Balance: {formatUsdc(usdcBalance)} USDC
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="bet-amount"
                type="number"
                min="1"
                max="1000"
                step="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="pr-16 font-mono h-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                USDC
              </span>
            </div>
            {amountError() && (
              <p className="text-xs text-destructive">{amountError()}</p>
            )}
            <div className="flex gap-1.5">
              {[1, 5, 10, 50].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmountStr(v.toString())}
                  className="text-xs px-2 py-1 rounded border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <OddsDisplay yesPool={yesPool} noPool={noPool} size="sm" />

          {/* Estimate */}
          {amount > 0n && estimatedShares > 0n && (
            <div className="flex items-center justify-between text-sm p-3 rounded bg-muted/30 border border-border/40">
              <span className="text-muted-foreground">Estimated shares</span>
              <span className="font-mono font-semibold tabular-nums">
                ~{formatUsdc(estimatedShares)}
              </span>
            </div>
          )}

          <Separator className="opacity-30" />

          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">Gasless</Badge>
            Gas sponsored by Circle Paymaster. You only pay USDC.
          </div>

          {!isOpen || bettingClosed ? (
            <div className="flex items-center gap-2 p-3 rounded border border-border/60 text-sm text-muted-foreground">
              <AlertTriangle className="size-4" />
              Betting is closed for this market.
            </div>
          ) : !connected ? (
            <Button onClick={connect} className="w-full gap-2">
              Connect wallet to bet
            </Button>
          ) : (
            <Button
              onClick={placeBet}
              disabled={busy || !canBet || txStatus === "done"}
              className={cn(
                "w-full gap-2 font-semibold",
                side === "yes"
                  ? "bg-yes hover:bg-yes/90 text-white"
                  : "bg-no hover:bg-no/90 text-white"
              )}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : side === "yes" ? (
                <TrendingDown className="size-4" />
              ) : (
                <TrendingUp className="size-4" />
              )}
              {busy
                ? txStatus === "approving"
                  ? "Approving…"
                  : "Confirming…"
                : `Bet ${formatUsdc(amount)} USDC ${side.toUpperCase()}`}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
