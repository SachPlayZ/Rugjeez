import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/arc";
import {
  MARKET_REGISTRY_ADDRESS,
  MarketRegistryAbi,
  BinaryMarketAbi,
} from "@/lib/contracts";

export const dynamic = "force-dynamic";

export interface TickerItem {
  t: string;
  p: string;
  dir: "up" | "down";
  alert: boolean;
}

const FALLBACK_ITEMS: TickerItem[] = [
  { t: "AGENT",  p: "SCANNING…",     dir: "up",   alert: false },
  { t: "$BARK",  p: "-62.1%",        dir: "down",  alert: true  },
  { t: "$PDOGE", p: "-12.4%",        dir: "down",  alert: false },
  { t: "$VAPR",  p: "-28.0%",        dir: "down",  alert: true  },
  { t: "#0412",  p: "MINTED",        dir: "up",    alert: false },
  { t: "$JEET",  p: "RESOLVED YES",  dir: "down",  alert: true  },
  { t: "$GPEPE", p: "-44.6%",        dir: "down",  alert: true  },
  { t: "$WGMI",  p: "+18.0%",        dir: "up",    alert: false },
  { t: "AGENT",  p: "UPTIME 99.97%", dir: "up",    alert: false },
  { t: "$BANA",  p: "+412%",         dir: "up",    alert: false },
];

async function fetchDexScreener(
  symbol: string
): Promise<{ change24h: number } | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`,
      { next: { revalidate: 55 }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: {
      baseToken?: { symbol?: string };
      priceChange?: { h24?: number };
      volume?: { h24?: number };
    }[] = data.pairs ?? [];

    // Pick the highest-volume pair whose base token matches the symbol
    const candidates = pairs
      .filter(
        (p) => p.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase()
      )
      .sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0));

    if (!candidates.length) return null;
    return { change24h: candidates[0].priceChange?.h24 ?? 0 };
  } catch {
    return null;
  }
}

const rpc = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", { timeout: 8000 }),
});

export async function GET() {
  try {
    const addresses = (await rpc.readContract({
      address: MARKET_REGISTRY_ADDRESS,
      abi: MarketRegistryAbi,
      functionName: "getMarkets",
    })) as `0x${string}`[];

    const recent = [...addresses].reverse().slice(0, 6);
    if (!recent.length) {
      return Response.json({ items: FALLBACK_ITEMS, ts: Date.now() });
    }

    const symbols = await Promise.all(
      recent.map(
        (addr) =>
          rpc.readContract({
            address: addr,
            abi: BinaryMarketAbi,
            functionName: "tokenSymbol",
          }) as Promise<string>
      )
    );

    const priceResults = await Promise.allSettled(
      symbols.map(fetchDexScreener)
    );

    const items: TickerItem[] = [
      { t: "AGENT", p: "SCANNING…", dir: "up", alert: false },
    ];

    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const result = priceResults[i];
      if (result.status === "fulfilled" && result.value !== null) {
        const { change24h } = result.value;
        const dir: "up" | "down" = change24h >= 0 ? "up" : "down";
        const sign = change24h >= 0 ? "+" : "";
        items.push({
          t: `$${sym}`,
          p: `${sign}${change24h.toFixed(1)}%`,
          dir,
          alert: change24h <= -20,
        });
      } else {
        items.push({ t: `$${sym}`, p: "LIVE", dir: "up", alert: false });
      }
    }

    return Response.json({ items, ts: Date.now() });
  } catch {
    return Response.json({ items: FALLBACK_ITEMS, ts: Date.now() });
  }
}
