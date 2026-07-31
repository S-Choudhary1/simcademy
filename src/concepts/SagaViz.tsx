"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "The saga pattern", body: "A distributed transaction as a chain of local ones: each step commits and emits an event; a failure triggers compensating events that undo the earlier steps." },
  { target: "[data-tour='saga-failat']", title: "Choose where it fails", body: "Pick the step that fails — or 'None' to let the whole saga succeed." },
  { target: "[data-tour='saga-run']", title: "Run the saga", body: "Watch events drive each step forward, then — on failure — compensations run in reverse to roll everything back." },
  { target: "[data-tour='saga-steps']", title: "Steps & events", body: "Green = committed and emitted its event. Red = the failed step. Amber = compensated (undone) by its reverse event." },
];

type StepState = "idle" | "done" | "failed" | "compensated";
const STEPS = [
  { name: "Order", event: "OrderCreated", undo: "OrderCancelled" },
  { name: "Payment", event: "PaymentCharged", undo: "PaymentRefunded" },
  { name: "Inventory", event: "StockReserved", undo: "StockReleased" },
  { name: "Shipping", event: "ShipmentBooked", undo: "ShipmentCancelled" },
];

interface Action {
  kind: "commit" | "fail" | "compensate";
  index: number;
  event: string;
  tone: "ok" | "bad" | "warn";
  text: string;
}

export function SagaViz() {
  const [failAt, setFailAt] = useState(2); // Inventory
  const [states, setStates] = useState<StepState[]>(STEPS.map(() => "idle"));
  const [active, setActive] = useState<Action | null>(null);
  const [log, setLog] = useState<Action[]>([]);
  const [playing, setPlaying] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => clear(), []);

  const build = (fail: number): Action[] => {
    const acts: Action[] = [];
    const fails = fail >= 0 && fail < STEPS.length;
    const lastForward = fails ? fail : STEPS.length;
    for (let i = 0; i < lastForward; i++) {
      acts.push({ kind: "commit", index: i, event: STEPS[i].event, tone: "ok", text: `${STEPS[i].name}: local transaction commits → emits ${STEPS[i].event}` });
    }
    if (fails) {
      acts.push({ kind: "fail", index: fail, event: `${STEPS[fail].name}Failed`, tone: "bad", text: `${STEPS[fail].name}: FAILED → emits ${STEPS[fail].name}Failed. Rolling back…` });
      for (let j = fail - 1; j >= 0; j--) {
        acts.push({ kind: "compensate", index: j, event: STEPS[j].undo, tone: "warn", text: `↩ Compensate ${STEPS[j].name} → emits ${STEPS[j].undo}` });
      }
    }
    return acts;
  };

  const run = () => {
    clear();
    const acts = build(failAt);
    setStates(STEPS.map(() => "idle"));
    setActive(null);
    setLog([]);
    setVerdict(null);
    setPlaying(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      if (i >= acts.length) {
        clear();
        setActive(null);
        setPlaying(false);
        setVerdict(
          failAt >= STEPS.length
            ? "Saga completed — every step committed and emitted its event."
            : "Saga rolled back — the failure event triggered compensating events in reverse, undoing each committed step.",
        );
        return;
      }
      const a = acts[i];
      setActive(a);
      setStates((s) => s.map((v, idx) => (idx === a.index ? (a.kind === "commit" ? "done" : a.kind === "fail" ? "failed" : "compensated") : v)));
      setLog((l) => [...l, a]);
      i += 1;
    }, 950);
  };

  const reset = () => {
    clear();
    setStates(STEPS.map(() => "idle"));
    setActive(null);
    setLog([]);
    setVerdict(null);
    setPlaying(false);
  };

  const stepStyle: Record<StepState, string> = {
    idle: "border-slate-700 bg-slate-900 text-slate-400",
    done: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
    failed: "border-red-500/50 bg-red-500/10 text-red-300",
    compensated: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300" data-tour="saga-failat">
          <span className="text-slate-400">Fail at</span>
          <select
            value={failAt}
            onChange={(e) => {
              setFailAt(Number(e.target.value));
              reset();
            }}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
          >
            {STEPS.map((s, i) => (
              <option key={s.name} value={i}>
                {s.name}
              </option>
            ))}
            <option value={STEPS.length}>None (all succeed)</option>
          </select>
        </label>
        <button type="button" onClick={run} disabled={playing} data-tour="saga-run" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">
          Run saga
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      {/* latest event banner */}
      <div
        className={`mb-3 rounded-lg border px-3 py-1.5 text-center text-sm ${
          !active
            ? "border-slate-800 bg-slate-900 text-slate-500"
            : active.tone === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : active.tone === "bad"
                ? "border-red-500/50 bg-red-500/10 text-red-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-300"
        }`}
      >
        {active ? `📨 event: ${active.event}` : "no event yet"}
      </div>

      {/* steps + event connectors */}
      <div className="flex flex-wrap items-start justify-center gap-1" data-tour="saga-steps">
        {STEPS.map((s, i) => {
          const chip =
            states[i] === "done"
              ? { text: `✓ ${s.event}`, cls: "text-emerald-300" }
              : states[i] === "failed"
                ? { text: `✗ ${s.name}Failed`, cls: "text-red-300" }
                : states[i] === "compensated"
                  ? { text: `↩ ${s.undo}`, cls: "text-amber-300" }
                  : { text: "", cls: "" };
          const connForward = active?.kind === "commit" && active.index === i && i < STEPS.length - 1;
          return (
            <div key={s.name} className="flex items-start">
              <div className="flex w-[104px] flex-col items-center">
                <div className={`w-full rounded-lg border px-2 py-2 text-center ${stepStyle[states[i]]}`}>
                  <div className="text-xs font-semibold">{s.name}</div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-wide opacity-70">{states[i]}</div>
                </div>
                <div className={`mt-1 h-3 text-[9px] font-mono ${chip.cls}`}>{chip.text}</div>
              </div>
              {i < STEPS.length - 1 ? (
                <div className="flex w-[92px] flex-col items-center pt-3">
                  <span className={connForward ? "text-sky-300" : "text-slate-600"}>→</span>
                  <span className={`text-[9px] font-mono ${connForward ? "text-sky-300" : "text-slate-600"}`}>{s.event}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {verdict ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">{verdict}</div>
      ) : null}

      <div className="mt-3 space-y-1 text-xs">
        {log.length === 0 ? (
          <p className="text-slate-600">Choose where it fails, then Run to watch events drive each step — and the compensation events undo them in reverse.</p>
        ) : (
          log.map((a, i) => (
            <p key={i} className={a.tone === "ok" ? "text-emerald-300" : a.tone === "bad" ? "text-red-300" : "text-amber-300"}>
              {a.text}
            </p>
          ))
        )}
      </div>
      <GuidedTour tourId="saga" steps={TOUR} autoStart={false} />
    </div>
  );
}
