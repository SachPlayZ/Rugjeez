"use client";

import {
  toPasskeyTransport,
  toModularTransport,
  toWebAuthnCredential,
  toCircleSmartAccount,
  WebAuthnMode,
} from "@circle-fin/modular-wallets-core";
import {
  toWebAuthnAccount,
  createBundlerClient,
  type SmartAccount,
  type P256Credential,
} from "viem/account-abstraction";
import { createPublicClient } from "viem";
import { useEffect, useState } from "react";
import { arcTestnet } from "./arc";
import { publicClient } from "./arc";
import { USDC_ADDRESS } from "./contracts";

const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY ?? "";
const clientUrl =
  process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL ??
  "https://modular-sdk.circle.com/v1/rpc/w3s/buidl";

export const passkeyTransport = clientKey
  ? toPasskeyTransport(clientUrl, clientKey)
  : null;

export const modularTransport = clientKey
  ? toModularTransport(`${clientUrl}/arcTestnet`, clientKey)
  : null;

export const bundlerClient = modularTransport
  ? createBundlerClient({ chain: arcTestnet, transport: modularTransport })
  : null;

export const modularPublicClient = modularTransport
  ? createPublicClient({ chain: arcTestnet, transport: modularTransport })
  : null;

const CRED_KEY = "rugjeez:credential";

export function loadCredential(): P256Credential | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCredential(cred: P256Credential) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CRED_KEY, JSON.stringify(cred));
}

export function clearCredential() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CRED_KEY);
}

export async function registerPasskey(username: string): Promise<P256Credential> {
  if (!passkeyTransport) throw new Error("Circle client key not configured");
  const cred = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Register,
    username,
  });
  saveCredential(cred);
  return cred;
}

export async function loginPasskey(): Promise<P256Credential> {
  if (!passkeyTransport) throw new Error("Circle client key not configured");
  const cred = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login,
  });
  saveCredential(cred);
  return cred;
}

export async function getSmartAccount(
  cred: P256Credential
): Promise<SmartAccount> {
  if (!modularPublicClient) throw new Error("Circle client key not configured");
  return toCircleSmartAccount({
    client: modularPublicClient,
    owner: toWebAuthnAccount({ credential: cred }),
  });
}

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useUsdcBalance(address: `0x${string}` | null): bigint | null {
  const [balance, setBalance] = useState<bigint | null>(null);

  useEffect(() => {
    if (!address) { setBalance(null); return; }

    let cancelled = false;

    async function fetch() {
      try {
        const raw = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [address!],
        });
        if (!cancelled) setBalance(raw as bigint);
      } catch {
        // silently ignore — balance stays null
      }
    }

    fetch();
    const id = setInterval(fetch, 12_000); // refresh every ~1 block
    return () => { cancelled = true; clearInterval(id); };
  }, [address]);

  return balance;
}
