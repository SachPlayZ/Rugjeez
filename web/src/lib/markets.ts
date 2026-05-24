"use client";

import { publicClient, DEPLOY_BLOCK, wssClient } from "./arc";
import {
  MARKET_REGISTRY_ADDRESS,
  MarketRegistryAbi,
  BinaryMarketAbi,
  formatUsdc,
} from "./contracts";
import { readContract, getBlock } from "viem/actions";

export type MarketState = 0 | 1 | 2; // Open | Resolved | Cancelled

export interface MarketInfo {
  address: `0x${string}`;
  tokenId: `0x${string}`;
  tokenChain: string;
  tokenSymbol: string;
  baselinePrice: bigint;
  thresholdBps: bigint;
  resolvesAt: bigint;
  traceHash: `0x${string}`;
  yesPool: bigint;
  noPool: bigint;
  createdAt: bigint;
  state: MarketState;
  resolvedYes: boolean;
  bettingClosesAt: bigint;
}

export interface MarketCreatedEvent {
  market: `0x${string}`;
  tokenId: `0x${string}`;
  tokenChain: string;
  tokenSymbol: string;
  baselinePrice: bigint;
  thresholdBps: bigint;
  resolvesAt: bigint;
  traceHash: `0x${string}`;
  yesPool: bigint;
  noPool: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

const CACHE_KEY = "rugoracle:markets:v1";

function getCachedMarkets(): { block: string; markets: MarketCreatedEvent[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedMarkets(block: bigint, markets: MarketCreatedEvent[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        block: block.toString(),
        markets: markets.map((m) => ({
          ...m,
          baselinePrice: m.baselinePrice.toString(),
          thresholdBps: m.thresholdBps.toString(),
          resolvesAt: m.resolvesAt.toString(),
          yesPool: m.yesPool.toString(),
          noPool: m.noPool.toString(),
          blockNumber: m.blockNumber.toString(),
        })),
      })
    );
  } catch {
    // storage full – ignore
  }
}

function deserializeMarket(m: Record<string, unknown>): MarketCreatedEvent {
  return {
    ...(m as MarketCreatedEvent),
    baselinePrice: BigInt(m.baselinePrice as string),
    thresholdBps: BigInt(m.thresholdBps as string),
    resolvesAt: BigInt(m.resolvesAt as string),
    yesPool: BigInt(m.yesPool as string),
    noPool: BigInt(m.noPool as string),
    blockNumber: BigInt(m.blockNumber as string),
  };
}

export async function getAllMarketEvents(): Promise<MarketCreatedEvent[]> {
  const latest = await publicClient.getBlockNumber();
  const cached = getCachedMarkets();

  let fromBlock = DEPLOY_BLOCK;
  let accumulated: MarketCreatedEvent[] = [];

  if (cached && BigInt(cached.block) >= latest - 10n) {
    return cached.markets.map(deserializeMarket);
  }

  if (cached) {
    accumulated = cached.markets.map(deserializeMarket);
    fromBlock = BigInt(cached.block) + 1n;
  }

  const CHUNK = 1000n;
  const chunks: Promise<typeof accumulated>[] = [];

  for (let from = fromBlock; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    chunks.push(
      publicClient
        .getLogs({
          address: MARKET_REGISTRY_ADDRESS,
          event: {
            type: "event",
            name: "MarketCreated",
            inputs: [
              { name: "market", type: "address", indexed: true },
              { name: "tokenId", type: "bytes32", indexed: true },
              { name: "tokenChain", type: "string", indexed: false },
              { name: "tokenSymbol", type: "string", indexed: false },
              { name: "baselinePrice", type: "uint256", indexed: false },
              { name: "thresholdBps", type: "uint256", indexed: false },
              { name: "resolvesAt", type: "uint256", indexed: false },
              { name: "traceHash", type: "bytes32", indexed: false },
              { name: "yesPool", type: "uint256", indexed: false },
              { name: "noPool", type: "uint256", indexed: false },
            ],
          },
          fromBlock: from,
          toBlock: to,
        })
        .then((logs) =>
          logs.map((log) => ({
            market: (log.args as Record<string, unknown>).market as `0x${string}`,
            tokenId: (log.args as Record<string, unknown>).tokenId as `0x${string}`,
            tokenChain: (log.args as Record<string, unknown>).tokenChain as string,
            tokenSymbol: (log.args as Record<string, unknown>).tokenSymbol as string,
            baselinePrice: (log.args as Record<string, unknown>).baselinePrice as bigint,
            thresholdBps: (log.args as Record<string, unknown>).thresholdBps as bigint,
            resolvesAt: (log.args as Record<string, unknown>).resolvesAt as bigint,
            traceHash: (log.args as Record<string, unknown>).traceHash as `0x${string}`,
            yesPool: (log.args as Record<string, unknown>).yesPool as bigint,
            noPool: (log.args as Record<string, unknown>).noPool as bigint,
            blockNumber: log.blockNumber ?? 0n,
            transactionHash: log.transactionHash as `0x${string}`,
          }))
        )
    );
  }

  const results = (await Promise.all(chunks)).flat();
  accumulated = [...accumulated, ...results];
  setCachedMarkets(latest, accumulated);
  return accumulated;
}

export async function getMarketDetail(address: `0x${string}`): Promise<MarketInfo> {
  const contract = { address, abi: BinaryMarketAbi } as const;

  const [
    tokenChain,
    tokenSymbol,
    tokenId,
    baselinePrice,
    thresholdBps,
    resolvesAt,
    bettingClosesAt,
    traceHash,
    yesPool,
    noPool,
    createdAt,
    state,
    resolvedYes,
  ] = await Promise.all([
    readContract(publicClient, { ...contract, functionName: "tokenChain" }),
    readContract(publicClient, { ...contract, functionName: "tokenSymbol" }),
    readContract(publicClient, { ...contract, functionName: "tokenId" }),
    readContract(publicClient, { ...contract, functionName: "baselinePrice" }),
    readContract(publicClient, { ...contract, functionName: "thresholdBps" }),
    readContract(publicClient, { ...contract, functionName: "resolvesAt" }),
    readContract(publicClient, { ...contract, functionName: "bettingClosesAt" }),
    readContract(publicClient, { ...contract, functionName: "traceHash" }),
    readContract(publicClient, { ...contract, functionName: "yesPool" }),
    readContract(publicClient, { ...contract, functionName: "noPool" }),
    readContract(publicClient, { ...contract, functionName: "createdAt" }),
    readContract(publicClient, { ...contract, functionName: "state" }),
    readContract(publicClient, { ...contract, functionName: "resolvedYes" }),
  ]);

  return {
    address,
    tokenId: tokenId as `0x${string}`,
    tokenChain: tokenChain as string,
    tokenSymbol: tokenSymbol as string,
    baselinePrice: baselinePrice as bigint,
    thresholdBps: thresholdBps as bigint,
    resolvesAt: resolvesAt as bigint,
    bettingClosesAt: bettingClosesAt as bigint,
    traceHash: traceHash as `0x${string}`,
    yesPool: yesPool as bigint,
    noPool: noPool as bigint,
    createdAt: createdAt as bigint,
    state: state as MarketState,
    resolvedYes: resolvedYes as boolean,
  };
}

export async function getUserShares(
  marketAddress: `0x${string}`,
  userAddress: `0x${string}`
): Promise<{ yes: bigint; no: bigint }> {
  const contract = { address: marketAddress, abi: BinaryMarketAbi } as const;
  const [yes, no] = await Promise.all([
    readContract(publicClient, { ...contract, functionName: "yesShares", args: [userAddress] }),
    readContract(publicClient, { ...contract, functionName: "noShares", args: [userAddress] }),
  ]);
  return { yes: yes as bigint, no: no as bigint };
}

export function calcOdds(yesPool: bigint, noPool: bigint): { yesPct: number; noPct: number } {
  const total = yesPool + noPool;
  if (total === 0n) return { yesPct: 50, noPct: 50 };
  const yesPct = Number((yesPool * 10000n) / total) / 100;
  return { yesPct, noPct: 100 - yesPct };
}

export function calcShares(amount: bigint, poolIn: bigint, poolOut: bigint): bigint {
  if (poolOut === 0n) return amount;
  return (amount * poolOut) / (poolIn + amount);
}

export function timeUntil(unixSeconds: bigint): string {
  const diff = Number(unixSeconds) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function watchNewMarkets(
  onMarket: (event: MarketCreatedEvent) => void
): () => void {
  const unwatch = wssClient.watchEvent({
    address: MARKET_REGISTRY_ADDRESS,
    event: {
      type: "event",
      name: "MarketCreated",
      inputs: [
        { name: "market", type: "address", indexed: true },
        { name: "tokenId", type: "bytes32", indexed: true },
        { name: "tokenChain", type: "string", indexed: false },
        { name: "tokenSymbol", type: "string", indexed: false },
        { name: "baselinePrice", type: "uint256", indexed: false },
        { name: "thresholdBps", type: "uint256", indexed: false },
        { name: "resolvesAt", type: "uint256", indexed: false },
        { name: "traceHash", type: "bytes32", indexed: false },
        { name: "yesPool", type: "uint256", indexed: false },
        { name: "noPool", type: "uint256", indexed: false },
      ],
    },
    onLogs: (logs) => {
      for (const log of logs) {
        const args = log.args as Record<string, unknown>;
        onMarket({
          market: args.market as `0x${string}`,
          tokenId: args.tokenId as `0x${string}`,
          tokenChain: args.tokenChain as string,
          tokenSymbol: args.tokenSymbol as string,
          baselinePrice: args.baselinePrice as bigint,
          thresholdBps: args.thresholdBps as bigint,
          resolvesAt: args.resolvesAt as bigint,
          traceHash: args.traceHash as `0x${string}`,
          yesPool: args.yesPool as bigint,
          noPool: args.noPool as bigint,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash as `0x${string}`,
        });
      }
    },
  });
  return unwatch;
}
