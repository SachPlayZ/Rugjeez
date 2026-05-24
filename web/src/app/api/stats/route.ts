import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/arc";
import {
  MARKET_REGISTRY_ADDRESS,
  MarketRegistryAbi,
  BinaryMarketAbi,
} from "@/lib/contracts";

const rpc = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", { timeout: 8000 }),
});

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [count, allAddresses, blockNumber] = await Promise.all([
      rpc.readContract({
        address: MARKET_REGISTRY_ADDRESS,
        abi: MarketRegistryAbi,
        functionName: "marketCount",
      }) as Promise<bigint>,
      rpc.readContract({
        address: MARKET_REGISTRY_ADDRESS,
        abi: MarketRegistryAbi,
        functionName: "getMarkets",
      }) as Promise<`0x${string}`[]>,
      rpc.getBlockNumber(),
    ]);

    const totalMarkets = Number(count);
    const reversed = [...allAddresses].reverse();
    const detailSlice = reversed.slice(0, 6);

    const marketData = await Promise.all(
      detailSlice.map(async (addr) => {
        const [yesPool, noPool, tokenSymbol, resolvesAt, state, resolvedYes, createdAt] =
          await Promise.all([
            rpc.readContract({ address: addr, abi: BinaryMarketAbi, functionName: "yesPool" }) as Promise<bigint>,
            rpc.readContract({ address: addr, abi: BinaryMarketAbi, functionName: "noPool" }) as Promise<bigint>,
            rpc.readContract({ address: addr, abi: BinaryMarketAbi, functionName: "tokenSymbol" }) as Promise<string>,
            rpc.readContract({ address: addr, abi: BinaryMarketAbi, functionName: "resolvesAt" }) as Promise<bigint>,
            rpc.readContract({ address: addr, abi: BinaryMarketAbi, functionName: "state" }) as Promise<number>,
            rpc.readContract({ address: addr, abi: BinaryMarketAbi, functionName: "resolvedYes" }) as Promise<boolean>,
            rpc.readContract({ address: addr, abi: BinaryMarketAbi, functionName: "createdAt" }) as Promise<bigint>,
          ]);
        return {
          address: addr,
          tokenSymbol,
          yesPool: yesPool.toString(),
          noPool: noPool.toString(),
          resolvesAt: resolvesAt.toString(),
          state,
          resolvedYes,
          createdAt: createdAt.toString(),
        };
      })
    );

    const openMarkets = marketData.filter((m) => m.state === 0).length;
    const rugsConfirmed = marketData.filter((m) => m.state === 1 && m.resolvedYes).length;
    const totalResolved = marketData.filter((m) => m.state === 1).length;
    const accuracy = totalResolved > 0 ? Math.round((rugsConfirmed / totalResolved) * 100) : 0;
    const totalUsdcWagered = marketData
      .reduce((s, m) => s + BigInt(m.yesPool) + BigInt(m.noPool), 0n)
      .toString();

    return Response.json(
      {
        totalMarkets,
        openMarkets,
        rugsConfirmed,
        accuracy,
        totalUsdcWagered,
        markets: marketData,
        latestBlock: blockNumber.toString(),
        ts: Date.now(),
      },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    return Response.json(
      {
        error: String(e),
        totalMarkets: 0,
        openMarkets: 0,
        rugsConfirmed: 0,
        accuracy: 0,
        totalUsdcWagered: "0",
        markets: [],
        latestBlock: "0",
        ts: Date.now(),
      },
      { status: 200 }
    );
  }
}
