"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Circuit breaker", body: "One breaker per dependency, so a single sick service can't drag down calls to the healthy ones." },
  { target: "[data-tour='cb-play']", title: "Run the calls", body: "Play/Pause. Each tick the app calls all three services." },
  { target: "[data-tour='cb-services']", title: "Break a service", body: "Each service has its own breaker. Click Healthy → Failing: after 3 failures its breaker trips OPEN and rejects instantly (fail fast), while the others keep serving. After a cooldown it half-opens to probe recovery." },
];

type BreakerState = "closed" | "open" | "half-open";
const THRESHOLD = 3;
const COOLDOWN = 5;
const SERVICES = ["Payments", "Inventory", "Search"];

interface Machine {
  state: BreakerState;
  failures: number;
  openTicks: number;
}
interface View {
  state: BreakerState;
  failures: number;
  cooldown: number;
  last: string;
}

/**
 * Circuit Breaker across MULTIPLE dependencies — one breaker per service.
 *
 * The app calls three services; each has its own independent breaker. Flip one
 * dependency to Failing and only ITS breaker trips OPEN (fail fast) while the
 * others stay CLOSED. That isolation is why a breaker is per-dependency: a sick
 * service can't drag down calls to healthy ones.
 */
export function CircuitBreakerViz() {
  const [running, setRunning] = useState(true);
  const [healthy, setHealthy] = useState<boolean[]>(SERVICES.map(() => true));
  const [view, setView] = useState<View[]>(SERVICES.map(() => ({ state: "closed", failures: 0, cooldown: 0, last: "—" })));

  const machines = useRef<Machine[]>(SERVICES.map(() => ({ state: "closed", failures: 0, openTicks: 0 })));
  const healthyRef = useRef(healthy);
  useEffect(() => {
    healthyRef.current = healthy;
  }, [healthy]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const next: View[] = machines.current.map((m, i) => {
        const up = healthyRef.current[i];
        let last = "";
        if (m.state === "open") {
          m.openTicks += 1;
          if (m.openTicks >= COOLDOWN) {
            m.state = "half-open";
            m.openTicks = 0;
            last = "probe →";
          } else {
            last = "rejected (fail fast)";
          }
        } else if (up) {
          if (m.state === "half-open") {
            m.state = "closed";
            m.failures = 0;
            last = "probe ok → closed";
          } else {
            m.failures = 0;
            last = "ok";
          }
        } else {
          m.failures += 1;
          if (m.state === "half-open") {
            m.state = "open";
            m.openTicks = 0;
            last = "probe failed → open";
          } else if (m.failures >= THRESHOLD) {
            m.state = "open";
            m.openTicks = 0;
            last = "threshold hit → OPEN";
          } else {
            last = `failed (${m.failures}/${THRESHOLD})`;
          }
        }
        return { state: m.state, failures: m.failures, cooldown: m.state === "open" ? COOLDOWN - m.openTicks : 0, last };
      });
      setView(next);
    }, 750);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = (i: number) => setHealthy((h) => h.map((v, idx) => (idx === i ? !v : v)));
  const reset = () => {
    machines.current = SERVICES.map(() => ({ state: "closed", failures: 0, openTicks: 0 }));
    setHealthy(SERVICES.map(() => true));
    setView(SERVICES.map(() => ({ state: "closed", failures: 0, cooldown: 0, last: "—" })));
  };

  const badge: Record<BreakerState, string> = {
    closed: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
    open: "border-red-500/50 bg-red-500/10 text-red-300",
    "half-open": "border-amber-500/50 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-semibold text-slate-100">App / API</div>
        <span className="text-slate-600">calls →</span>
        <button type="button" onClick={() => setRunning((r) => !r)} data-tour="cb-play" className="ml-auto rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          {running ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" data-tour="cb-services">
        {SERVICES.map((name, i) => {
          const v = view[i];
          return (
            <div key={name} className={`rounded-lg border p-3 ${badge[v.state]}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">{name}</span>
                <span className="text-[10px] font-bold uppercase">{v.state}</span>
              </div>
              <div className="mt-1 text-[11px] opacity-80">
                {v.state === "closed" && `failures ${v.failures}/${THRESHOLD}`}
                {v.state === "open" && `fail fast · probe in ${v.cooldown}`}
                {v.state === "half-open" && "probing…"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-400">{v.last}</div>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`mt-2 w-full rounded-md border px-2 py-1 text-xs font-medium ${
                  healthy[i] ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"
                }`}
              >
                {healthy[i] ? "Healthy" : "Failing"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        Flip one service to <span className="text-red-300">Failing</span>: after {THRESHOLD} failures its breaker trips
        OPEN and rejects instantly — while the other services keep serving. Each dependency has its own breaker, so one
        failure is contained.
      </p>
      <GuidedTour tourId="circuit-breaker" steps={TOUR} autoStart={false} />
    </div>
  );
}
