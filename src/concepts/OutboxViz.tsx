"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Transactional outbox", body: "Writing to the DB and publishing an event aren't atomic — the 'dual-write problem'. The outbox pattern makes them consistent." },
  { target: "[data-tour='outbox-mode']", title: "Two approaches", body: "Compare the naive dual-write with the transactional outbox." },
  { target: "[data-tour='outbox-scenario']", title: "Pick a failure", body: "Choose what goes wrong — crash after the DB write, broker down, relay crash — the interesting cases." },
  { target: "[data-tour='outbox-run']", title: "Run it", body: "Step through the scenario and read the verdict at the end." },
  { target: "[data-tour='outbox-pipeline']", title: "Watch the pipeline", body: "Naive: a crash between DB and broker loses the event. Outbox: the event row commits WITH the order, then a relay delivers it — never lost, but at-least-once (so consumers must be idempotent)." },
];

type Mode = "naive" | "outbox";
interface VizState {
  dbOrder: boolean;
  outbox: "none" | "pending" | "sent";
  events: number;
}
interface Step {
  text: string;
  kind: "ok" | "bad" | "warn" | "info";
  patch: Partial<VizState>;
}
interface Scenario {
  id: string;
  label: string;
  steps: Step[];
  verdict: { tone: "ok" | "warn" | "bad"; text: string };
}

const INIT: VizState = { dbOrder: false, outbox: "none", events: 0 };

const SCENARIOS: Record<Mode, Scenario[]> = {
  naive: [
    {
      id: "happy",
      label: "Everything works",
      steps: [
        { text: "createOrder() begins.", kind: "info", patch: {} },
        { text: "DB: INSERT order → COMMIT ✓", kind: "ok", patch: { dbOrder: true } },
        { text: "Publish OrderCreated → broker ✓", kind: "ok", patch: { events: 1 } },
      ],
      verdict: { tone: "ok", text: "Consistent — but only because nothing failed. The two writes were never atomic." },
    },
    {
      id: "crash-after-db",
      label: "Crash after DB write",
      steps: [
        { text: "createOrder() begins.", kind: "info", patch: {} },
        { text: "DB: INSERT order → COMMIT ✓", kind: "ok", patch: { dbOrder: true } },
        { text: "💥 Service crashes before publishing the event.", kind: "bad", patch: {} },
      ],
      verdict: {
        tone: "bad",
        text: "Inconsistent: the order is in the DB but the event was never published. Downstream services never learn about it — a lost event.",
      },
    },
    {
      id: "broker-down",
      label: "Broker unavailable",
      steps: [
        { text: "createOrder() begins.", kind: "info", patch: {} },
        { text: "DB: INSERT order → COMMIT ✓", kind: "ok", patch: { dbOrder: true } },
        { text: "Publish OrderCreated → ✕ broker unavailable.", kind: "bad", patch: {} },
      ],
      verdict: {
        tone: "bad",
        text: "Inconsistent: order saved, event lost. Retrying here is unsafe — you'd risk a double publish or blocking the DB transaction. The dual write is the flaw.",
      },
    },
  ],
  outbox: [
    {
      id: "happy",
      label: "Everything works",
      steps: [
        { text: "BEGIN transaction.", kind: "info", patch: {} },
        { text: "DB: INSERT order + INSERT outbox row → COMMIT ✓ (atomic)", kind: "ok", patch: { dbOrder: true, outbox: "pending" } },
        { text: "Relay polls outbox → publishes OrderCreated ✓", kind: "ok", patch: { events: 1 } },
        { text: "Relay marks outbox row as sent ✓", kind: "ok", patch: { outbox: "sent" } },
      ],
      verdict: { tone: "ok", text: "Consistent: the order and the intent to publish committed together, then the relay delivered it." },
    },
    {
      id: "tx-fail",
      label: "Transaction fails",
      steps: [
        { text: "BEGIN transaction.", kind: "info", patch: {} },
        { text: "💥 Transaction fails → ROLLBACK.", kind: "warn", patch: {} },
      ],
      verdict: {
        tone: "ok",
        text: "Consistent: nothing was written and no event was promised. All-or-nothing — the whole point of putting the outbox row in the same transaction.",
      },
    },
    {
      id: "broker-down",
      label: "Broker down, then recovers",
      steps: [
        { text: "BEGIN transaction.", kind: "info", patch: {} },
        { text: "DB: INSERT order + outbox row → COMMIT ✓ (atomic)", kind: "ok", patch: { dbOrder: true, outbox: "pending" } },
        { text: "Relay tries to publish → ✕ broker down. Row stays PENDING.", kind: "warn", patch: {} },
        { text: "Broker recovers. Relay retries → publishes ✓", kind: "ok", patch: { events: 1 } },
        { text: "Relay marks row sent ✓", kind: "ok", patch: { outbox: "sent" } },
      ],
      verdict: {
        tone: "ok",
        text: "Consistent: the event was never lost — the outbox held it until the broker came back (at-least-once delivery).",
      },
    },
    {
      id: "crash-after-publish",
      label: "Relay crashes after publish",
      steps: [
        { text: "BEGIN transaction.", kind: "info", patch: {} },
        { text: "DB: INSERT order + outbox row → COMMIT ✓", kind: "ok", patch: { dbOrder: true, outbox: "pending" } },
        { text: "Relay publishes OrderCreated ✓", kind: "ok", patch: { events: 1 } },
        { text: "💥 Relay crashes before marking the row sent.", kind: "warn", patch: {} },
        { text: "Relay restarts, sees PENDING row → publishes again (duplicate).", kind: "warn", patch: { events: 2 } },
        { text: "Marks row sent ✓", kind: "ok", patch: { outbox: "sent" } },
      ],
      verdict: {
        tone: "warn",
        text: "Delivered twice (at-least-once). No event is ever lost, but consumers must be idempotent to dedupe. This is the trade the outbox makes.",
      },
    },
  ],
};

export function OutboxViz() {
  const [mode, setMode] = useState<Mode>("naive");
  const [sel, setSel] = useState(0);
  const [state, setState] = useState<VizState>(INIT);
  const [log, setLog] = useState<Step[]>([]);
  const [verdict, setVerdict] = useState<Scenario["verdict"] | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const scenarios = SCENARIOS[mode];
  const current = scenarios[Math.min(sel, scenarios.length - 1)];

  const clear = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => clear(), []);

  const reset = () => {
    clear();
    setState(INIT);
    setLog([]);
    setVerdict(null);
    setPlaying(false);
  };

  const run = () => {
    clear();
    setState(INIT);
    setLog([]);
    setVerdict(null);
    setPlaying(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      if (i >= current.steps.length) {
        clear();
        setVerdict(current.verdict);
        setPlaying(false);
        return;
      }
      const step = current.steps[i];
      setState((s) => ({ ...s, ...step.patch }));
      setLog((l) => [...l, step]);
      i += 1;
    }, 850);
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    setSel(0);
    reset();
  };
  const changeScenario = (i: number) => {
    setSel(i);
    reset();
  };

  const verdictCls =
    verdict?.tone === "ok"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : verdict?.tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-red-500/40 bg-red-500/10 text-red-300";

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="outbox-mode">
          {(["naive", "outbox"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                mode === m ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {m === "naive" ? "Naive dual-write" : "Transactional Outbox"}
            </button>
          ))}
        </div>
        <select
          value={sel}
          onChange={(e) => changeScenario(Number(e.target.value))}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
          aria-label="Scenario"
          data-tour="outbox-scenario"
        >
          {scenarios.map((s, i) => (
            <option key={s.id} value={i}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={playing}
          data-tour="outbox-run"
          className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
        >
          Run
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset
        </button>
      </div>

      {/* pipeline */}
      <div className="flex flex-wrap items-center gap-2" data-tour="outbox-pipeline">
        <Box title="Service" sub="createOrder()" active />
        <Arrow />
        <Box
          title="Database"
          sub={state.dbOrder ? "order saved ✓" : "—"}
          tone={state.dbOrder ? "ok" : "idle"}
        />
        {mode === "outbox" ? (
          <>
            <Arrow />
            <Box
              title="Outbox"
              sub={state.outbox === "none" ? "—" : state.outbox === "pending" ? "PENDING" : "sent ✓"}
              tone={state.outbox === "pending" ? "warn" : state.outbox === "sent" ? "ok" : "idle"}
            />
            <Arrow />
            <Box title="Relay" sub="poll → publish" tone="idle" />
          </>
        ) : null}
        <Arrow />
        <Box
          title="Broker"
          sub={state.events === 0 ? "—" : `${state.events} event${state.events > 1 ? "s ⚠" : ""}`}
          tone={state.events > 1 ? "warn" : state.events === 1 ? "ok" : "idle"}
        />
      </div>

      {verdict ? <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${verdictCls}`}>{verdict.text}</div> : null}

      {/* log */}
      <div className="mt-3 space-y-1 text-xs">
        {log.length === 0 ? (
          <p className="text-slate-600">Pick a scenario and press Run to step through it.</p>
        ) : (
          log.map((s, i) => (
            <p
              key={i}
              className={
                s.kind === "ok"
                  ? "text-emerald-300"
                  : s.kind === "bad"
                    ? "text-red-300"
                    : s.kind === "warn"
                      ? "text-amber-300"
                      : "text-slate-400"
              }
            >
              {s.text}
            </p>
          ))
        )}
      </div>
      <GuidedTour tourId="outbox" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Box({ title, sub, tone = "idle", active = false }: { title: string; sub: string; tone?: "ok" | "warn" | "idle"; active?: boolean }) {
  const border =
    tone === "ok" ? "border-emerald-500/50" : tone === "warn" ? "border-amber-500/50" : active ? "border-sky-500/50" : "border-slate-800";
  return (
    <div className={`min-w-[92px] rounded-lg border bg-slate-900 px-3 py-2 text-center ${border}`}>
      <div className="text-xs font-semibold text-slate-100">{title}</div>
      <div className="mt-0.5 text-[10px] tabular-nums text-slate-400">{sub}</div>
    </div>
  );
}

function Arrow() {
  return <span className="text-slate-600">→</span>;
}
