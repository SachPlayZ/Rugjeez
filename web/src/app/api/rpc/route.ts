const ARC_RPC =
  process.env.ARC_RPC_URL ??
  process.env.NEXT_PUBLIC_ARC_RPC_URL ??
  "https://rpc.testnet.arc.network";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
