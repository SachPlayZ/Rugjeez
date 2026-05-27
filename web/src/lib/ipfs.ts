const GATEWAYS = [
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
];

const TIMEOUT_MS = 10_000;

export interface ReasoningTrace {
  verdict: "open_market" | "monitor" | "ignore";
  confidence: number;
  rationale: string;
  market_params: {
    threshold_bps: number;
    duration_hours: number;
    initial_liquidity_usdc: number;
  };
  evidence_summary: Array<{
    source: string;
    summary: string;
    weight: number;
  }>;
  manual_demo?: boolean;
}

const traceCache = new Map<string, ReasoningTrace>();

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTrace(cid: string): Promise<ReasoningTrace> {
  if (traceCache.has(cid)) return traceCache.get(cid)!;

  let lastError: unknown;
  for (const gateway of GATEWAYS) {
    try {
      const res = await fetchWithTimeout(`${gateway}${cid}`);
      if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
      const data: ReasoningTrace = await res.json();
      traceCache.set(cid, data);
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function fetchTraceByCid(
  cid: string
): Promise<ReasoningTrace | null> {
  try {
    return await fetchTrace(cid);
  } catch {
    return null;
  }
}
