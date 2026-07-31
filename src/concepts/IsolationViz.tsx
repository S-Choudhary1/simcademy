"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

/* ================================================================== *
 * Transaction isolation levels & MVCC. Two transactions interleave;
 * whether an anomaly (dirty / non-repeatable / phantom read) shows up
 * depends on the isolation level. Higher levels read from an MVCC
 * snapshot, so concurrent commits stay invisible.
 *
 * Matrix follows the SQL standard. PostgreSQL is stricter (see notes).
 * ================================================================== */

type Level = "read-uncommitted" | "read-committed" | "repeatable-read" | "serializable";
type Scenario = "dirty" | "nonrepeatable" | "phantom";

const LEVELS: { k: Level; label: string }[] = [
  { k: "read-uncommitted", label: "Read Uncommitted" },
  { k: "read-committed", label: "Read Committed" },
  { k: "repeatable-read", label: "Repeatable Read" },
  { k: "serializable", label: "Serializable" },
];
const SCENARIOS: { k: Scenario; label: string }[] = [
  { k: "dirty", label: "Dirty read" },
  { k: "nonrepeatable", label: "Non-repeatable read" },
  { k: "phantom", label: "Phantom read" },
];
const LABEL: Record<Level, string> = Object.fromEntries(LEVELS.map((l) => [l.k, l.label])) as Record<Level, string>;

/** SQL-standard: which anomalies each level still permits. */
function allowed(scenario: Scenario, level: Level): boolean {
  if (scenario === "dirty") return level === "read-uncommitted";
  if (scenario === "nonrepeatable") return level === "read-uncommitted" || level === "read-committed";
  // phantom
  return level !== "serializable";
}

interface Step { tx: "T1" | "T2" | "sys"; text: string; kind: "info" | "ok" | "bad" | "warn" }

function build(scenario: Scenario, level: Level): { steps: Step[]; verdict: { tone: "ok" | "bad"; text: string } } {
  const bad = allowed(scenario, level);
  const lvl = LABEL[level];
  if (scenario === "dirty") {
    return {
      steps: [
        { tx: "T2", text: `BEGIN — isolation ${lvl}`, kind: "info" },
        { tx: "T1", text: "BEGIN; UPDATE accounts SET balance = 150  (not committed yet)", kind: "warn" },
        {
          tx: "T2",
          text: bad ? "SELECT balance → 150  ← reads T1's UNCOMMITTED write (dirty!)" : "SELECT balance → 100  (only committed data is visible)",
          kind: bad ? "bad" : "ok",
        },
        { tx: "T1", text: "ROLLBACK — that 150 never existed; balance is 100", kind: "warn" },
      ],
      verdict: bad
        ? { tone: "bad", text: "Dirty read: T2 acted on 150 — a value that was rolled back and never committed." }
        : { tone: "ok", text: "No dirty read: uncommitted changes are invisible, so T2 only ever saw 100." },
    };
  }
  if (scenario === "nonrepeatable") {
    return {
      steps: [
        { tx: "T2", text: `BEGIN — isolation ${lvl}`, kind: "info" },
        { tx: "T2", text: "SELECT balance → 100", kind: "info" },
        { tx: "T1", text: "BEGIN; UPDATE balance = 150; COMMIT", kind: "warn" },
        {
          tx: "T2",
          text: bad ? "SELECT balance → 150  ← same row, different value mid-transaction!" : "SELECT balance → 100  (from T2's snapshot)",
          kind: bad ? "bad" : "ok",
        },
      ],
      verdict: bad
        ? { tone: "bad", text: "Non-repeatable read: the same SELECT returned 100, then 150, inside one transaction." }
        : { tone: "ok", text: "Repeatable: T2 reads from an MVCC snapshot taken at BEGIN, so the row stays 100 until T2 ends." },
    };
  }
  return {
    steps: [
      { tx: "T2", text: `BEGIN — isolation ${lvl}`, kind: "info" },
      { tx: "T2", text: "SELECT count(*) WHERE amount > 50 → 1", kind: "info" },
      { tx: "T1", text: "BEGIN; INSERT INTO t (amount) VALUES (80); COMMIT", kind: "warn" },
      {
        tx: "T2",
        text: bad ? "SELECT count(*) WHERE amount > 50 → 2  ← a phantom row appeared" : "SELECT count(*) WHERE amount > 50 → 1  (snapshot range is stable)",
        kind: bad ? "bad" : "ok",
      },
    ],
    verdict: bad
      ? { tone: "bad", text: "Phantom read: a newly-committed row matching the same predicate appeared mid-transaction." }
      : { tone: "ok", text: "No phantom: Serializable keeps the whole range stable for T2." },
  };
}

const TOUR: TourStep[] = [
  { title: "Isolation levels & MVCC", body: "Two transactions interleave. Which read anomaly shows up depends on the isolation level — higher levels read from a consistent snapshot." },
  { target: "[data-tour='iso-level']", title: "Isolation level", body: "Weakest (Read Uncommitted) to strongest (Serializable). The matrix on the right updates to show what each one prevents." },
  { target: "[data-tour='iso-scenario']", title: "Pick an anomaly", body: "Dirty, non-repeatable, or phantom read — each is a classic two-transaction interleaving." },
  { target: "[data-tour='iso-run']", title: "Run it", body: "Step through T1 and T2 and see whether the anomaly happens at the chosen level." },
  { target: "[data-tour='iso-matrix']", title: "The guarantee matrix", body: "✓ = prevented, ✗ = allowed at the current level. This is the whole point of isolation levels." },
];

export function IsolationViz() {
  const [level, setLevel] = useState<Level>("read-committed");
  const [scenario, setScenario] = useState<Scenario>("nonrepeatable");
  const [steps, setSteps] = useState<Step[]>([]);
  const [tick, setTick] = useState(0);
  const [verdict, setVerdict] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => clear(), []);

  const reset = () => {
    clear();
    setSteps([]);
    setTick(0);
    setVerdict(null);
    setPlaying(false);
  };

  const run = () => {
    clear();
    const { steps: s, verdict: v } = build(scenario, level);
    setSteps(s);
    setTick(0);
    setVerdict(null);
    setPlaying(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setTick(i);
      if (i >= s.length) {
        clear();
        setVerdict(v);
        setPlaying(false);
      }
    }, 950);
  };

  const shown = steps.slice(0, tick);
  const txStyle = { T1: "border-sky-500/40 bg-sky-500/10", T2: "border-fuchsia-500/40 bg-fuchsia-500/10", sys: "border-slate-700 bg-slate-900" };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300" data-tour="iso-level">
          <span className="text-slate-400">Level</span>
          <select value={level} onChange={(e) => { setLevel(e.target.value as Level); reset(); }} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200">
            {LEVELS.map((l) => (<option key={l.k} value={l.k}>{l.label}</option>))}
          </select>
        </label>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="iso-scenario">
          {SCENARIOS.map((sc) => (
            <button key={sc.k} type="button" onClick={() => { setScenario(sc.k); reset(); }} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${scenario === sc.k ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>
              {sc.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={run} disabled={playing} data-tour="iso-run" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">Run</button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        {/* interleaving log */}
        <div>
          <div className="mb-1 flex gap-3 text-[11px] uppercase tracking-wide">
            <span className="text-sky-400">T1 writer</span>
            <span className="text-fuchsia-400">T2 reader</span>
          </div>
          <div className="min-h-[132px] space-y-1">
            {shown.length === 0 ? (
              <p className="text-xs text-slate-600">Pick a level and anomaly, then Run to watch the two transactions interleave.</p>
            ) : (
              shown.map((s, i) => (
                <div key={i} className={`flex items-start gap-2 rounded border px-2 py-1 text-[12px] ${txStyle[s.tx]}`}>
                  <span className={`shrink-0 font-mono text-[10px] font-bold ${s.tx === "T1" ? "text-sky-300" : s.tx === "T2" ? "text-fuchsia-300" : "text-slate-500"}`}>{s.tx === "sys" ? "··" : s.tx}</span>
                  <span className={s.kind === "bad" ? "text-red-300" : s.kind === "ok" ? "text-emerald-300" : s.kind === "warn" ? "text-amber-300" : "text-slate-300"}>{s.text}</span>
                </div>
              ))
            )}
          </div>
          {verdict ? (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${verdict.tone === "ok" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/50 bg-red-500/10 text-red-300"}`}>
              {verdict.text}
            </div>
          ) : null}
        </div>

        {/* guarantee matrix for current level */}
        <div data-tour="iso-matrix">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">At {LABEL[level]}</div>
          <div className="space-y-1">
            {SCENARIOS.map((sc) => {
              const bad = allowed(sc.k, level);
              const active = sc.k === scenario;
              return (
                <div key={sc.k} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[12px] ${active ? "border-slate-600 bg-slate-900" : "border-slate-800 bg-slate-900/40"}`}>
                  <span className="text-slate-300">{sc.label}</span>
                  <span className={bad ? "font-semibold text-red-300" : "font-semibold text-emerald-300"}>{bad ? "✗ allowed" : "✓ prevented"}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-slate-500">Higher levels prevent more anomalies — at the cost of more locking / aborts.</p>
        </div>
      </div>

      <GuidedTour tourId="isolation-levels" steps={TOUR} autoStart={false} />
    </div>
  );
}
