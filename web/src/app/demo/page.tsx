"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusFooter } from "@/components/StatusFooter";
import { WalletProvider } from "@/components/WalletConnect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { watchNewMarkets } from "@/lib/markets";
import { ThinkingPanel, STEP_INTERVAL_MS, TOTAL_STEPS } from "./components/ThinkingPanel";
import { CandidateCard, type Candidate } from "./components/CandidateCard";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

const DEMO_API_URL =
  process.env.NEXT_PUBLIC_AGENT_DEMO_URL ?? "http://localhost:8787";
const DEMO_SECRET = process.env.NEXT_PUBLIC_DEMO_API_SECRET ?? "x9k2vp4z";

export default function DemoPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string | undefined>();
  const [thinkingStep, setThinkingStep] = useState(0);
  const [done, setDone] = useState(false);
  const stepInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const unwatchRef = useRef<(() => void) | null>(null);

  // Fetch candidates from agent on mount
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${DEMO_API_URL}/demo-${DEMO_SECRET}/candidates`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Agent returned ${r.status}`);
        return r.json();
      })
      .then((d: { candidates?: Candidate[] }) =>
        setCandidates(d.candidates ?? [])
      )
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setFetchError(
            err instanceof Error
              ? err.message
              : "Could not reach agent. Is it running?"
          );
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stepInterval.current) clearInterval(stepInterval.current);
      unwatchRef.current?.();
    };
  }, []);

  function resetInjection() {
    if (stepInterval.current) clearInterval(stepInterval.current);
    unwatchRef.current?.();
    setActiveId(null);
    setActiveSymbol(undefined);
    setThinkingStep(0);
    setDone(false);
  }

  async function triggerInject(candidate: Candidate) {
    if (activeId) return;

    setActiveId(candidate.id);
    setActiveSymbol(candidate.symbol);
    setThinkingStep(0);
    setDone(false);

    // Advance thinking steps — 10 steps × 700ms = 7s
    stepInterval.current = setInterval(() => {
      setThinkingStep((s) => {
        if (s >= TOTAL_STEPS - 1) {
          clearInterval(stepInterval.current!);
          return s;
        }
        return s + 1;
      });
    }, STEP_INTERVAL_MS);

    // Watch for the minted market event
    unwatchRef.current = watchNewMarkets((event) => {
      const matchSymbol =
        event.tokenSymbol.toLowerCase() === candidate.symbol.toLowerCase();
      const matchId =
        candidate.token_id &&
        event.tokenId.toLowerCase() === candidate.token_id.toLowerCase();

      if (matchSymbol || matchId) {
        clearInterval(stepInterval.current!);
        unwatchRef.current?.();
        setDone(true);
        toast.success("Market minted!", {
          description: `$${event.tokenSymbol} on Arc — redirecting…`,
          duration: 4000,
        });
        setTimeout(() => router.push(`/m/${event.market}`), 1500);
      }
    });

    // POST the injection
    try {
      const res = await fetch(`${DEMO_API_URL}/demo-${DEMO_SECRET}/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidate.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { detail?: string }).detail ?? `Server ${res.status}`
        );
      }
    } catch (err: unknown) {
      clearInterval(stepInterval.current!);
      unwatchRef.current?.();
      setActiveId(null);
      setDone(false);
      toast.error("Injection failed", {
        description:
          err instanceof Error ? err.message : "Could not reach agent",
      });
    }
  }

  const showThinking = !!activeId;

  return (
    <WalletProvider>
      <div className="flex flex-col min-h-dvh">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <FlaskConical className="size-5 text-primary" />
              <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
                Demo Console
              </h1>
              <Badge
                variant="outline"
                className="text-xs border-primary/30 text-primary"
              >
                Live Agent
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Pick a real NFI blacklist addition. Watch the agent reason about it and
              mint a prediction market live on Arc Testnet — no simulation.
            </p>
          </div>

          <Separator className="opacity-30 my-6" />

          {/* Thinking panel — shown while injecting */}
          {showThinking && (
            <div className="mb-8">
              <ThinkingPanel
                currentStep={thinkingStep}
                done={done}
                symbol={activeSymbol}
              />
              {!done && (
                <button
                  onClick={resetInjection}
                  className="mt-3 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Fetch error */}
          {fetchError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {fetchError}
                <span className="block mt-1 text-xs opacity-70">
                  Make sure the agent is running:{" "}
                  <code className="font-mono">python -m agent.main</code>
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Candidate grid — wrapped in error boundary */}
          <ErrorBoundary label="Candidate grid">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : !fetchError && candidates.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                <FlaskConical className="size-10 opacity-30" />
                <div>
                  <p className="text-sm font-medium">No candidates loaded</p>
                  <p className="text-xs mt-1 opacity-60">
                    Start the agent and refresh the page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {candidates.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    isActive={activeId === c.id}
                    isDisabled={!!activeId}
                    onTrigger={triggerInject}
                  />
                ))}
              </div>
            )}
          </ErrorBoundary>

          <Separator className="opacity-30 my-8" />

          {/* Honesty footer */}
          <p className="text-xs text-muted-foreground/50 text-center leading-relaxed max-w-lg mx-auto italic">
            Demo mode: signals are pulled from real NFI blacklist commits. The agent
            reasons about and mints them on demand. In production, the agent processes
            commits autonomously as they happen.
          </p>
        </main>
        <StatusFooter />
      </div>
    </WalletProvider>
  );
}
