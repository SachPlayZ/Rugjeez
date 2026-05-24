import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/lib/arc";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
const FUND_AMOUNT = parseUnits("2", 6); // 2 USDC (6-decimal ERC-20)
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const cooldowns = new Map<string, number>();

export async function POST(req: NextRequest) {
  const privateKey = process.env.FAUCET_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ error: "Faucet not configured" }, { status: 503 });
  }

  let address: string;
  try {
    const body = await req.json();
    address = (body.address as string)?.toLowerCase();
    if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const lastFunded = cooldowns.get(address) ?? 0;
  const elapsed = Date.now() - lastFunded;
  if (elapsed < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Cooldown active", remaining: COOLDOWN_MS - elapsed },
      { status: 429 }
    );
  }

  try {
    const normalizedKey = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
    const account = privateKeyToAccount(normalizedKey);
    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(
        process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network"
      ),
    });

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [address as `0x${string}`, FUND_AMOUNT],
      maxFeePerGas: 20_000_000_000n, // 20 Gwei floor
    });

    cooldowns.set(address, Date.now());
    return NextResponse.json({ success: true, hash });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transfer failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
