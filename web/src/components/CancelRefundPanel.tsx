"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "./WalletConnect";
import { bundlerClient } from "@/lib/wallets";
import { BinaryMarketAbi, formatUsdc } from "@/lib/contracts";
import { getUserShares, type MarketInfo } from "@/lib/markets";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { XCircle, Loader2, RefreshCw, Trophy } from "lucide-react";

interface Props {
  market: MarketInfo;
  onStateChange: () => void;
}

type TxStatus = "idle" | "confirming" | "done" | "error";

export function CancelRefundPanel({ market, onStateChange }: Props) {
  const { account, connected, connect, address } = useWallet();
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [userShares, setUserShares] = useState<{ yes: bigint; no: bigint } | null>(null);

  const now = Math.floor(Date.now() / 1000);
  const isOpen = market.state === 0;
  const isResolved = market.state === 1;
  const isCancelled = market.state === 2;
  const gracePassed = now > Number(market.resolvesAt) + 86400;
  const canCancel = isOpen && gracePassed;

  useEffect(() => {
    if ((!isCancelled && !isResolved) || !address) return;
    getUserShares(market.address, address)
      .then(setUserShares)
      .catch(() => setUserShares({ yes: 0n, no: 0n }));
  }, [isCancelled, isResolved, address, market.address]);

  const estimatedRefund = (() => {
    if (!userShares || !isCancelled) return 0n;
    const totalPool = market.yesPool + market.noPool;
    let payout = 0n;
    if (userShares.yes > 0n && market.yesPool > 0n)
      payout += (userShares.yes * totalPool) / market.yesPool;
    if (userShares.no > 0n && market.noPool > 0n)
      payout += (userShares.no * totalPool) / market.noPool;
    return payout;
  })();

  const estimatedClaim = (() => {
    if (!userShares || !isResolved) return 0n;
    const totalPool = market.yesPool + market.noPool;
    if (market.resolvedYes) {
      if (userShares.yes === 0n || market.yesPool === 0n) return 0n;
      return (userShares.yes * totalPool) / market.yesPool;
    } else {
      if (userShares.no === 0n || market.noPool === 0n) return 0n;
      return (userShares.no * totalPool) / market.noPool;
    }
  })();

  const busy = txStatus === "confirming";

  if (!canCancel && !isCancelled && !isResolved) return null;

  async function cancelMarket() {
    if (!account || !bundlerClient) { connect(); return; }
    setTxStatus("confirming");
    try {
      const data = encodeFunctionData({
        abi: BinaryMarketAbi,
        functionName: "cancelIfUnresolved",
        args: [],
      });
      const hash = await bundlerClient.sendUserOperation({
        account,
        calls: [{ to: market.address, data }],
        paymaster: true,
        maxPriorityFeePerGas: 1_000_000_000n,
      });
      await bundlerClient.waitForUserOperationReceipt({ hash });
      setTxStatus("done");
      toast.success("Market cancelled — refunds are now claimable.");
      onStateChange();
    } catch (err) {
      setTxStatus("error");
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Cancel failed", { description: msg });
      setTimeout(() => setTxStatus("idle"), 2000);
    }
  }

  async function claimWinnings() {
    if (!account || !bundlerClient) { connect(); return; }
    setTxStatus("confirming");
    try {
      const data = encodeFunctionData({
        abi: BinaryMarketAbi,
        functionName: "claim",
        args: [],
      });
      const hash = await bundlerClient.sendUserOperation({
        account,
        calls: [{ to: market.address, data }],
        paymaster: true,
        maxPriorityFeePerGas: 1_000_000_000n,
      });
      await bundlerClient.waitForUserOperationReceipt({ hash });
      setTxStatus("done");
      toast.success("Winnings claimed!", {
        description: `${formatUsdc(estimatedClaim)} USDC sent to your wallet.`,
      });
      onStateChange();
    } catch (err) {
      setTxStatus("error");
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Claim failed", { description: msg });
      setTimeout(() => setTxStatus("idle"), 2000);
    }
  }

  async function claimRefund() {
    if (!account || !bundlerClient) { connect(); return; }
    setTxStatus("confirming");
    try {
      const data = encodeFunctionData({
        abi: BinaryMarketAbi,
        functionName: "refund",
        args: [],
      });
      const hash = await bundlerClient.sendUserOperation({
        account,
        calls: [{ to: market.address, data }],
        paymaster: true,
        maxPriorityFeePerGas: 1_000_000_000n,
      });
      await bundlerClient.waitForUserOperationReceipt({ hash });
      setTxStatus("done");
      toast.success("Refund claimed!", {
        description: `${formatUsdc(estimatedRefund)} USDC returned to your wallet.`,
      });
      onStateChange();
    } catch (err) {
      setTxStatus("error");
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Refund failed", { description: msg });
      setTimeout(() => setTxStatus("idle"), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-5 rounded-lg border border-border/60 bg-card">
      {canCancel && (
        <>
          <div className="flex items-start gap-3">
            <XCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Market unresolved</p>
              <p className="text-xs text-muted-foreground">
                The agent did not resolve this market within the 24-hour grace period.
                Anyone can cancel it now to unlock proportional refunds for all bettors.
              </p>
            </div>
          </div>
          {!connected ? (
            <Button variant="outline" onClick={connect} className="w-full gap-2 text-sm">
              Connect wallet to cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={cancelMarket}
              disabled={busy || txStatus === "done"}
              className="w-full gap-2 text-sm border-destructive/40 hover:border-destructive text-destructive hover:text-destructive hover:bg-destructive/5"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              {busy ? "Cancelling…" : "Cancel market & enable refunds"}
            </Button>
          )}
        </>
      )}

      {isResolved && (
        <>
          <div className="flex items-start gap-3">
            <Trophy className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Market resolved</p>
              <p className="text-xs text-muted-foreground">
                {estimatedClaim > 0n
                  ? `You won ~${formatUsdc(estimatedClaim)} USDC. Claim your payout.`
                  : connected
                  ? "No winning balance for your wallet on this market."
                  : "Connect wallet to check your payout."}
              </p>
            </div>
          </div>
          {estimatedClaim > 0n && (
            !connected ? (
              <Button variant="outline" onClick={connect} className="w-full gap-2 text-sm">
                Connect wallet to claim
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={claimWinnings}
                disabled={busy || txStatus === "done"}
                className="w-full gap-2 text-sm border-no/40 hover:border-no text-no hover:text-no hover:bg-no/5"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trophy className="size-4" />
                )}
                {busy ? "Claiming…" : `Claim ~${formatUsdc(estimatedClaim)} USDC`}
              </Button>
            )
          )}
        </>
      )}

      {isCancelled && (
        <>
          <div className="flex items-start gap-3">
            <RefreshCw className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Market cancelled</p>
              <p className="text-xs text-muted-foreground">
                {estimatedRefund > 0n
                  ? `You have ~${formatUsdc(estimatedRefund)} USDC to refund.`
                  : connected
                  ? "No refundable balance for your wallet on this market."
                  : "All bettors can reclaim their stakes proportionally."}
              </p>
            </div>
          </div>
          {estimatedRefund > 0n && (
            !connected ? (
              <Button variant="outline" onClick={connect} className="w-full gap-2 text-sm">
                Connect wallet to claim refund
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={claimRefund}
                disabled={busy || txStatus === "done"}
                className="w-full gap-2 text-sm"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {busy ? "Claiming…" : `Claim ~${formatUsdc(estimatedRefund)} USDC`}
              </Button>
            )
          )}
        </>
      )}
    </div>
  );
}
