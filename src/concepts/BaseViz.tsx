"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "BASE — eventual consistency", body: "A write hits the primary instantly, then propagates to replicas after a delay. They're briefly out of sync, but eventually converge." },
  { target: "[data-tour='base-write']", title: "Write a value", body: "The primary updates immediately; the replicas start syncing." },
  { target: "[data-tour='base-replicas']", title: "Stale, then fresh", body: "During the sync window each replica shows a STALE read (amber) — then converges to fresh (green). Reads are available the whole time." },
  { target: "[data-tour='base-delay']", title: "Replication delay", body: "Widen the delay to make the stale window bigger — the trade-off BASE makes for availability." },
];

interface Replica {
  id: string;
  value: number;
  syncing: boolean;
}

/**
 * BASE / eventual consistency visualization.
 *
 * A write updates the primary immediately, then propagates to each replica after
 * a delay. During that window a replica read returns a STALE value; eventually
 * all replicas converge to the latest value. That is "eventually consistent".
 */
export function BaseViz() {
  const [primary, setPrimary] = useState(1);
  const [replicas, setReplicas] = useState<Replica[]>([
    { id: "Replica 1", value: 1, syncing: false },
    { id: "Replica 2", value: 1, syncing: false },
    { id: "Replica 3", value: 1, syncing: false },
  ]);
  const [delay, setDelay] = useState(1500);
  const timers = useRef<number[]>([]);
  const nextVal = useRef(2);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const write = () => {
    const v = nextVal.current++;
    setPrimary(v);
    setReplicas((rs) => rs.map((r) => ({ ...r, syncing: true })));
    replicas.forEach((r, i) => {
      const jitter = delay + i * 350 + Math.random() * 400;
      const t = window.setTimeout(() => {
        setReplicas((rs) => rs.map((x) => (x.id === r.id ? { ...x, value: v, syncing: false } : x)));
      }, jitter);
      timers.current.push(t);
    });
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    nextVal.current = 2;
    setPrimary(1);
    setReplicas((rs) => rs.map((r) => ({ ...r, value: 1, syncing: false })));
  };

  const allConverged = replicas.every((r) => r.value === primary);

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
        {/* primary */}
        <div className="flex flex-col justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 p-4 text-center">
          <div className="text-[11px] uppercase tracking-wide text-sky-300">Primary</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-sky-200">v{primary}</div>
          <div className="mt-1 text-[10px] text-slate-500">accepts writes</div>
        </div>

        <div className="hidden items-center text-slate-600 sm:flex">→</div>

        {/* replicas */}
        <div className="grid flex-1 grid-cols-3 gap-3" data-tour="base-replicas">
          {replicas.map((r) => {
            const stale = r.value !== primary;
            return (
              <div
                key={r.id}
                className={`rounded-lg border p-3 text-center ${
                  stale ? "border-amber-500/40 bg-amber-500/10" : "border-emerald-500/40 bg-emerald-500/10"
                }`}
              >
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{r.id}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">v{r.value}</div>
                <div className={`mt-1 text-[10px] ${stale ? "text-amber-300" : "text-emerald-300"}`}>
                  {r.syncing ? "stale · syncing…" : stale ? "stale read" : "fresh ✓"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
          allConverged
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-300"
        }`}
      >
        {allConverged ? "All replicas converged — consistent (for now)." : "Replicas catching up — reads may be stale."}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={write}
          data-tour="base-write"
          className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          Write new value
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300" data-tour="base-delay">
          <span className="text-slate-400">Replication delay</span>
          <input
            type="range"
            min={300}
            max={4000}
            step={100}
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-40 accent-sky-500"
          />
          <span className="w-16 tabular-nums text-slate-400">{(delay / 1000).toFixed(1)}s</span>
        </label>
      </div>
      <GuidedTour tourId="base" steps={TOUR} autoStart={false} />
    </div>
  );
}
