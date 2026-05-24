const GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

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

export async function fetchTrace(cid: string): Promise<ReasoningTrace> {
  if (traceCache.has(cid)) return traceCache.get(cid)!;

  const url = `${GATEWAY}${cid}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
  const data: ReasoningTrace = await res.json();
  traceCache.set(cid, data);
  return data;
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
