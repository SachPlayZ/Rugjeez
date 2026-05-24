import type { Abi } from "viem";
import MarketRegistryJson from "./abis/MarketRegistry.json";
import BinaryMarketJson from "./abis/BinaryMarket.json";
import TraceRegistryJson from "./abis/TraceRegistry.json";

export const MARKET_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_MARKET_REGISTRY_ADDRESS ??
  "0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b") as `0x${string}`;

export const TRACE_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_TRACE_REGISTRY_ADDRESS ??
  "0x614A1F64395FD1b925E347AC13812CC48b62f5B7") as `0x${string}`;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x3600000000000000000000000000000000000000") as `0x${string}`;

export const AGENT_ADDRESS = (process.env.NEXT_PUBLIC_AGENT_ADDRESS ??
  "0xe34b40f38217f9Dc8c3534735f7f41B2cDA73A75") as `0x${string}`;

export const MarketRegistryAbi = MarketRegistryJson.abi as Abi;
export const BinaryMarketAbi = BinaryMarketJson.abi as Abi;
export const TraceRegistryAbi = TraceRegistryJson.abi as Abi;

export const USDC_DECIMALS = 6;
export const MIN_BET_USDC = 1n * 10n ** 6n; // 1 USDC
export const MAX_BET_USDC = 1000n * 10n ** 6n; // 1000 USDC

export function formatUsdc(raw: bigint): string {
  const whole = raw / 10n ** 6n;
  const frac = raw % 10n ** 6n;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

export function parseUsdc(val: string): bigint {
  const [whole, frac = ""] = val.split(".");
  const fracPadded = frac.slice(0, 6).padEnd(6, "0");
  return BigInt(whole) * 10n ** 6n + BigInt(fracPadded);
}
