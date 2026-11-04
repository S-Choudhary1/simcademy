"use client";

import { useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Event sourcing", body: "There's no stored balance column — only an append-only log of events. State is derived by folding over them." },
  { target: "[data-tour='es-log']", title: "The event log", body: "Every change is an immutable event appended in order — the source of truth." },
  { target: "[data-tour='es-append']", title: "Append events", body: "Deposit or withdraw to append a new event. The balance is recomputed from the log, never overwritten." },
  { target: "[data-tour='es-scrubber']", title: "Time travel", body: "Drag to replay history to any past point and rebuild the exact state as it was then — impossible if you only stored the latest balance." },
];

interface Evt {
  type: "Opened" | "Deposited" | "Withdrew";
  amount: number;
}
const INITIAL: Evt[] = [
  { type: "Opened", amount: 0 },
  { type: "Deposited", amount: 100 },
  { type: "Withdrew", amount: 30 },
  { type: "Deposited", amount: 50 },
];

function fold(events: Evt[], upTo: number): number {
  let bal = 0;
  for (let i = 0; i < upTo; i++) {
    const e = events[i];
    if (e.type === "Deposited") bal += e.amount;
    else if (e.type === "Withdrew") bal -= e.amount;
  }
  return bal;
}

/**
 * Event Sourcing visualization. The account has no stored balance — only an
 * append-only log of events. Current state is a fold over the log, and moving
 * the scrubber replays history to any past point (time travel).
 */
export function EventSourcingViz() {
  const [events, setEvents] = useState<Evt[]>(INITIAL);
  const [upTo, setUpTo] = useState(INITIAL.length);

  const append = (e: Evt) => {
    const next = [...events, e];
    setEvents(next);
    setUpTo(next.length);
  };
  const reset = () => {
    setEvents(INITIAL);
    setUpTo(INITIAL.length);
  };

  const balance = fold(events, upTo);
  const live = upTo === events.length;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        {/* event log */}
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Event log (append-only)</div>
          <div className="space-y-1 font-mono text-xs" data-tour="es-log">
            {events.map((e, i) => {
              const applied = i < upTo;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    applied ? "bg-slate-900 text-slate-200" : "bg-slate-950 text-slate-600"
                  }`}
                >
                  <span className="text-slate-500">#{i}</span>
                  <span className={e.type === "Withdrew" ? "text-amber-300" : "text-emerald-300"}>{e.type}</span>
                  {e.type !== "Opened" ? <span className="tabular-nums">${e.amount}</span> : null}
                  {i === upTo - 1 ? <span className="ml-auto text-[10px] text-sky-400">← replayed to here</span> : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* derived state */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Derived balance</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-slate-100">${balance}</div>
            <div className="mt-1 text-[10px] text-slate-500">
              = fold(events[0…{upTo}]) {live ? "· live" : "· historical"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2" data-tour="es-append">
            <button type="button" onClick={() => append({ type: "Deposited", amount: 20 })} className="rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400">
              Deposit $20
            </button>
            <button type="button" onClick={() => append({ type: "Withdrew", amount: 10 })} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20">
              Withdraw $10
            </button>
            <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* time-travel scrubber */}
      <div className="mt-4" data-tour="es-scrubber">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="uppercase tracking-wide text-slate-500">Time travel</span>
          <span className="tabular-nums">
            replaying {upTo} of {events.length} events
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={events.length}
          step={1}
          value={upTo}
          onChange={(e) => setUpTo(Number(e.target.value))}
          className="w-full accent-sky-500"
        />
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          There is no stored &ldquo;balance&rdquo; column — the balance is <em>computed</em>{" "}from the events. Drag the
          scrubber to rebuild the state as it was at any point in history.
        </p>
      </div>
      <GuidedTour tourId="event-sourcing" steps={TOUR} autoStart={false} />
    </div>
  );
}
