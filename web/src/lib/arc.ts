import { createPublicClient, webSocket, http, fallback } from "viem";
import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
      ],
      webSocket: [
        process.env.NEXT_PUBLIC_ARC_WSS_URL ?? "wss://rpc.testnet.arc.network",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url:
        process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

function makePublicClient() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
  return createPublicClient({
    chain: arcTestnet,
    transport: fallback([http(rpcUrl), http("https://rpc.testnet.arc.network")], {
      retryCount: 3,
      retryDelay: 1000,
    }),
  });
}

function makeWssClient() {
  const wssUrl =
    process.env.NEXT_PUBLIC_ARC_WSS_URL ?? "wss://rpc.testnet.arc.network";
  return createPublicClient({
    chain: arcTestnet,
    transport: webSocket(wssUrl),
  });
}

export const publicClient = makePublicClient();
export const wssClient = makeWssClient();

export const DEPLOY_BLOCK = 1n;
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://testnet.arcscan.app";

export function explorerTx(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}
export function explorerAddress(addr: string) {
  return `${EXPLORER_URL}/address/${addr}`;
}
