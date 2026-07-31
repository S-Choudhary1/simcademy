"use client";

import { useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

/* ================================================================== *
 * Retries, backoff & jitter. Five clients all fail at t=0 and retry.
 * The timeline shows WHEN each client retries; the load histogram shows
 * how many retries land in each second. Without jitter every client
 * retries in lock-step → synchronized spikes (a thundering herd) that
 * re-hammer the struggling service. Jitter spreads them out.
 * ================================================================== */

type Strategy = "immediate" | "fixed" | "exponential" | "jitter";

const STRATEGIES: { k: Strategy; label: string; note: string }[] = [
  { k: "immediate", label: "Immediate", note: "Retry with no delay — hammers the service instantly and can turn a blip into an outage (retry storm)." },
  { k: "fixed", label: "Fixed delay", note: "Wait a constant gap. Simple, but every client still retries in lock-step → synchronized spikes." },
  { k: "exponential", label: "Exponential backoff", note: "Double the wait each time (1s, 2s, 4s, 8s) — gives the service room to recover, but clients still fire together." },
  { k: "jitter", label: "Exponential + jitter", note: "Randomize each delay so retries scatter across time — no synchronized spike. This is the production default." },
];

const CLIENTS = 5;
// Deterministic per-client jitter: a phase offset + a delay-scaling factor, so
// each client's whole retry sequence is shifted AND stretched differently —
// scattering retries instead of firing them in lock-step.
const PHASE = [0, 0.9, 1.8, 2.7, 3.6];
const FACTOR = [0.7, 0.85, 1.0, 1.15, 1.3];
const AXIS = 16; // seconds shown

// times[0] is the shared initial failure at t=0; the rest are retries.
function attemptsFor(strategy: Strategy, c: number): number[] {
  const delays = strategy === "immediate" ? [0.3, 0.3, 0.3, 0.3] : strategy === "fixed" ? [1, 1, 1, 1] : [1, 2, 4, 8];
  const times = [0];
  let t = 0;
  for (const d0 of delays) {
    t += strategy === "jitter" ? d0 * FACTOR[c] : d0;
    const at = strategy === "jitter" ? t + PHASE[c] : t;
    times.push(Math.round(at * 10) / 10);
  }
  return times;
}

const TOUR: TourStep[] = [
  { title: "Retries, backoff & jitter", body: "Five clients all fail at the same moment and retry. Watch how the retry strategy changes whether they re-hammer the service in sync." },
  { target: "[data-tour='rb-strategy']", title: "Pick a strategy", body: "From naive immediate retries to exponential backoff with jitter — the production default." },
  { target: "[data-tour='rb-timeline']", title: "Retry timeline", body: "Each row is a client; each dot is a retry attempt. Vertically-aligned dots mean everyone retries at the same instant." },
  { target: "[data-tour='rb-load']", title: "Load on the service", body: "Retries per second. Tall red bars are a thundering herd — synchronized retries that can keep a struggling service down. Jitter flattens them." },
];

export function RetryBackoffViz() {
  const [strategy, setStrategy] = useState<Strategy>("exponential");
  const meta = STRATEGIES.find((s) => s.k === strategy)!;

  const perClient = Array.from({ length: CLIENTS }, (_, c) => attemptsFor(strategy, c));

  // load histogram: RETRIES per 1s bin (the shared initial failure at t=0 is
  // identical for every strategy, so it's excluded — this shows retry load).
  const bins = Array.from({ length: AXIS }, () => 0);
  for (const times of perClient) for (let i = 1; i < times.length; i++) if (times[i] < AXIS) bins[Math.floor(times[i])] += 1;
  const peak = Math.max(...bins);

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 inline-flex flex-wrap rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="rb-strategy">
        {STRATEGIES.map((s) => (
          <button key={s.k} type="button" onClick={() => setStrategy(s.k)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${strategy === s.k ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>{s.label}</button>
        ))}
      </div>

      {/* retry timeline */}
      <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Retry timeline (each dot = an attempt)</div>
      <div className="space-y-1.5" data-tour="rb-timeline">
        {perClient.map((times, c) => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-mono text-[10px] text-slate-500">client {c + 1}</span>
            <div className="relative h-4 flex-1 rounded bg-slate-900">
              {times.map((t, i) => (
                <span key={i} title={`attempt ${i + 1} @ ${t}s`} className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${i === 0 ? "bg-slate-500" : "bg-sky-400"}`} style={{ left: `${Math.min(100, (t / AXIS) * 100)}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* load histogram */}
      <div className="mb-1 mt-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Retries hitting the service per second (initial failure excluded)</span>
        <span className="text-[11px] text-slate-400">peak <span className={`font-mono font-semibold ${peak >= 4 ? "text-red-300" : peak >= 3 ? "text-amber-300" : "text-emerald-300"}`}>{peak}</span>/s</span>
      </div>
      <div className="flex h-16 items-end gap-0.5" data-tour="rb-load">
        {bins.map((count, i) => (
          <div key={i} className="flex-1 rounded-t" title={`${count} retries in second ${i}`} style={{ height: `${(count / Math.max(1, peak)) * 100}%`, minHeight: count > 0 ? 3 : 0, background: count >= 4 ? "#f87171" : count >= 3 ? "#fbbf24" : "#34d399" }} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-slate-600"><span>0s</span><span>{AXIS}s</span></div>

      <p className="mt-3 text-[12px] leading-snug text-slate-400">{meta.note}</p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        The tell-tale sign is the load histogram: without jitter, the bars spike because every client retries on the same
        schedule — the <strong className="text-amber-300">thundering herd</strong> that keeps a recovering service pinned. Jitter
        turns those spikes into a flat, survivable trickle. Always cap retries and add jitter.
      </p>

      <GuidedTour tourId="retries-backoff" steps={TOUR} autoStart={false} />
    </div>
  );
}
