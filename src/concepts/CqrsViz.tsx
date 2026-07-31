"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "CQRS", body: "Split writes and reads into separate models, kept in sync by a projection — so each can be optimized independently." },
  { target: "[data-tour='cqrs-pipeline']", title: "Two models", body: "Commands mutate the write model, which emits events; a projection builds the read model from them. Queries only ever hit the read model." },
  { target: "[data-tour='cqrs-command']", title: "Write, then read", body: "Send a command, then query the read model — it reports an older version until the projection catches up (eventual consistency between models)." },
  { target: "[data-tour='cqrs-delay']", title: "Projection delay", body: "Raise the delay and fire several commands quickly to watch the read model fall behind." },
];

/**
 * CQRS visualization. Commands mutate the WRITE model, which emits events; a
 * projection asynchronously builds the READ model from those events. The two are
 * separate stores, so the read side lags briefly — eventual consistency between
 * models. Queries hit the read model, never the write model.
 */
export function CqrsViz() {
  const [writeV, setWriteV] = useState(0);
  const [readV, setReadV] = useState(0);
  const [delay, setDelay] = useState(1200);
  const [lastQuery, setLastQuery] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const sendCommand = () => {
    setWriteV((v) => v + 1);
    const t = window.setTimeout(() => setReadV((v) => v + 1), delay);
    timers.current.push(t);
  };

  const query = () => setLastQuery(readV);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setWriteV(0);
    setReadV(0);
    setLastQuery(null);
  };

  const lag = writeV - readV;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center" data-tour="cqrs-pipeline">
        {/* write side */}
        <Box title="Command" sub="write intent" tone="sky" />
        <Arrow />
        <Box title="Write Model" sub={`v${writeV}`} tone="sky" strong />
        <Arrow label="events" />
        {/* projection */}
        <Box title="Projection" sub={lag > 0 ? `${lag} in flight…` : "idle"} tone={lag > 0 ? "warn" : "idle"} />
        <Arrow />
        {/* read side */}
        <Box title="Read Model" sub={`v${readV}`} tone="emerald" strong />
        <Arrow label="queries" reverse />
        <Box title="Query" sub={lastQuery === null ? "—" : `got v${lastQuery}`} tone="emerald" />
      </div>

      <div
        className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
          lag === 0
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-300"
        }`}
      >
        {lag === 0
          ? "Read model is in sync with the write model."
          : `Read model is ${lag} version${lag > 1 ? "s" : ""} behind — queries can see stale data until the projection catches up (eventual consistency between models).`}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={sendCommand} data-tour="cqrs-command" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">
          Send command (write)
        </button>
        <button type="button" onClick={query} className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20">
          Query read model
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300" data-tour="cqrs-delay">
          <span className="text-slate-400">Projection delay</span>
          <input type="range" min={200} max={3000} step={100} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-36 accent-sky-500" />
          <span className="w-14 tabular-nums text-slate-400">{(delay / 1000).toFixed(1)}s</span>
        </label>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Fire several commands quickly, then query — the read model reports an older version until the projection catches up.
      </p>
      <GuidedTour tourId="cqrs" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Box({ title, sub, tone, strong = false }: { title: string; sub: string; tone: "sky" | "emerald" | "warn" | "idle"; strong?: boolean }) {
  const cls =
    tone === "sky"
      ? "border-sky-500/40 bg-sky-500/10"
      : tone === "emerald"
        ? "border-emerald-500/40 bg-emerald-500/10"
        : tone === "warn"
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-slate-800 bg-slate-900";
  return (
    <div className={`flex-1 rounded-lg border px-3 py-2 text-center ${cls}`}>
      <div className="text-xs font-semibold text-slate-100">{title}</div>
      <div className={`mt-0.5 tabular-nums ${strong ? "text-lg font-bold text-slate-100" : "text-[10px] text-slate-400"}`}>{sub}</div>
    </div>
  );
}

function Arrow({ label, reverse = false }: { label?: string; reverse?: boolean }) {
  return (
    <div className="flex flex-col items-center px-1 text-slate-600">
      <span>{reverse ? "←" : "→"}</span>
      {label ? <span className="text-[9px] text-slate-500">{label}</span> : null}
    </div>
  );
}
