"use client";

import { publicClient, DEPLOY_BLOCK, wssClient } from "./arc";
import {
  MARKET_REGISTRY_ADDRESS,
  MarketRegistryAbi,
  BinaryMarketAbi,
  formatUsdc,
} from "./contracts";
import { readContract } from "viem/actions";

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

const CACHE_KEY = "rugjeez:markets:v2";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeMarket(m: any): MarketCreatedEvent {
  return {
    ...(m as unknown as MarketCreatedEvent),
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
  const CONCURRENCY = 5;
  const ranges: Array<{ from: bigint; to: bigint }> = [];

  for (let from = fromBlock; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    ranges.push({ from, to });
  }

  async function fetchRange(from: bigint, to: bigint) {
    return publicClient
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
        );
  }

  // Process in batches to avoid hammering the RPC with hundreds of concurrent calls.
  const results: MarketCreatedEvent[] = [];
  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batch = ranges.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((r) => fetchRange(r.from, r.to)));
    results.push(...batchResults.flat());
  }

  accumulated = [...accumulated, ...results];
  setCachedMarkets(latest, accumulated);

  // Reconcile: registry is source of truth. Any address in getMarkets() not in
  // event results (e.g. due to RPC log gaps) gets filled via getMarketDetail().
  accumulated = await reconcileWithRegistry(accumulated, latest);

  return accumulated;
}

async function reconcileWithRegistry(
  events: MarketCreatedEvent[],
  latest: bigint,
): Promise<MarketCreatedEvent[]> {
  let allAddresses: `0x${string}`[];
  try {
    allAddresses = (await readContract(publicClient, {
      address: MARKET_REGISTRY_ADDRESS,
      abi: MarketRegistryAbi,
      functionName: "getMarkets",
    })) as `0x${string}`[];
  } catch {
    return events; // registry call failed — don't break the page
  }

  const known = new Set(events.map((m) => m.market.toLowerCase()));
  const missing = allAddresses.filter((a) => !known.has(a.toLowerCase()));
  if (missing.length === 0) return events;

  const filled = await Promise.all(
    missing.map(async (addr): Promise<MarketCreatedEvent | null> => {
      try {
        const d = await getMarketDetail(addr);
        return {
          market: d.address,
          tokenId: d.tokenId,
          tokenChain: d.tokenChain,
          tokenSymbol: d.tokenSymbol,
          baselinePrice: d.baselinePrice,
          thresholdBps: d.thresholdBps,
          resolvesAt: d.resolvesAt,
          traceHash: d.traceHash,
          yesPool: d.yesPool,
          noPool: d.noPool,
          blockNumber: 0n,
          transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        };
      } catch {
        return null;
      }
    })
  );

  const merged = [
    ...events,
    ...(filled.filter(Boolean) as MarketCreatedEvent[]),
  ];
  setCachedMarkets(latest, merged);
  return merged;
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

const POOLS_ABI = [
  {
    type: "function",
    name: "yesPool",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noPool",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function getLivePools(
  addresses: `0x${string}`[]
): Promise<Map<`0x${string}`, { yesPool: bigint; noPool: bigint }>> {
  const result = new Map<`0x${string}`, { yesPool: bigint; noPool: bigint }>();
  if (addresses.length === 0) return result;

  const pairs = await Promise.all(
    addresses.map(async (addr) => {
      const [yes, no] = await Promise.all([
        publicClient.readContract({ address: addr, abi: POOLS_ABI, functionName: "yesPool" }),
        publicClient.readContract({ address: addr, abi: POOLS_ABI, functionName: "noPool" }),
      ]);
      return [addr, { yesPool: yes as bigint, noPool: no as bigint }] as const;
    })
  );

  for (const [addr, pools] of pairs) result.set(addr, pools);
  return result;
}

export interface LeaderboardEntry {
  address: `0x${string}`;
  wagered: bigint;
  won: bigint;
  pnl: bigint;
}

const BET_EVENT = {
  type: "event",
  name: "Bet",
  inputs: [
    { name: "bettor", type: "address", indexed: true },
    { name: "yes", type: "bool", indexed: false },
    { name: "amount", type: "uint256", indexed: false },
    { name: "shares", type: "uint256", indexed: false },
  ],
} as const;

const CLAIMED_EVENT = {
  type: "event",
  name: "Claimed",
  inputs: [
    { name: "claimant", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;

export async function fetchLeaderboard(
  marketAddresses: `0x${string}`[]
): Promise<LeaderboardEntry[]> {
  if (marketAddresses.length === 0) return [];

  const wagered = new Map<string, bigint>();
  const won = new Map<string, bigint>();

  const BATCH = 5;
  for (let i = 0; i < marketAddresses.length; i += BATCH) {
    const batch = marketAddresses.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (addr) => {
        const [betLogs, claimLogs] = await Promise.all([
          publicClient.getLogs({ address: addr, event: BET_EVENT, fromBlock: DEPLOY_BLOCK }),
          publicClient.getLogs({ address: addr, event: CLAIMED_EVENT, fromBlock: DEPLOY_BLOCK }),
        ]);
        for (const log of betLogs) {
          const args = log.args as { bettor: `0x${string}`; amount: bigint };
          const key = args.bettor.toLowerCase();
          wagered.set(key, (wagered.get(key) ?? 0n) + args.amount);
        }
        for (const log of claimLogs) {
          const args = log.args as { claimant: `0x${string}`; amount: bigint };
          const key = args.claimant.toLowerCase();
          won.set(key, (won.get(key) ?? 0n) + args.amount);
        }
      })
    );
  }

  const allAddrs = new Set([...wagered.keys(), ...won.keys()]);
  return Array.from(allAddrs)
    .map((addr) => {
      const w = wagered.get(addr) ?? 0n;
      const wi = won.get(addr) ?? 0n;
      return { address: addr as `0x${string}`, wagered: w, won: wi, pnl: wi - w };
    })
    .sort((a, b) => (b.pnl > a.pnl ? 1 : b.pnl < a.pnl ? -1 : 0))
    .slice(0, 10);
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
