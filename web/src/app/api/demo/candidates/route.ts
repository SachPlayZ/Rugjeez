export const dynamic = "force-dynamic";

const AGENT_URL =
  process.env.AGENT_DEMO_URL ??
  process.env.NEXT_PUBLIC_AGENT_DEMO_URL ??
  "http://127.0.0.1:8787";

const SECRET =
  process.env.DEMO_API_SECRET ??
  process.env.NEXT_PUBLIC_DEMO_API_SECRET ??
  "x9k2vp4z";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/demo-${SECRET}/candidates`, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 0 },
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach agent";
    return Response.json({ error: message }, { status: 502 });
  }
}
