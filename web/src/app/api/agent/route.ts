export const dynamic = "force-dynamic";

const AGENT_URL = process.env.AGENT_HEALTH_URL ?? "http://127.0.0.1:8787/health";

export async function GET() {
  try {
    const res = await fetch(AGENT_URL, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`agent ${res.status}`);
    const data = await res.json();
    return Response.json({ status: "ok", ...data });
  } catch {
    return Response.json({ status: "offline" });
  }
}
