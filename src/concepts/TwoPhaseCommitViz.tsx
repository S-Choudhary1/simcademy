"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Two-phase commit", body: "A coordinator asks every participant to PREPARE and vote, then tells them all to COMMIT (if unanimous) or ABORT — atomic across databases." },
  { target: "[data-tour='tpc-scenario']", title: "Pick a scenario", body: "All commit, one aborts (a NO vote rolls everyone back), or the coordinator crashes mid-way." },
  { target: "[data-tour='tpc-run']", title: "Run the phases", body: "Step through Phase 1 (PREPARE + vote) and Phase 2 (COMMIT/ABORT)." },
  { target: "[data-tour='tpc-participants']", title: "Watch the participants", body: "Prepared = locks held. In the crash scenario they're stuck in-doubt holding locks until the coordinator recovers — 2PC's blocking flaw." },
];

type PState = "idle" | "prepared" | "committed" | "aborted" | "blocked";
type Scenario = "commit" | "abort" | "crash";
const PARTICIPANTS = ["Orders DB", "Inventory DB", "Payments DB"];

interface Step {
  text: string;
  kind: "info" | "ok" | "warn" | "bad";
  coord?: string;
  set?: { i: number; state: PState };
  setAll?: PState;
}

const SCENARIOS: Record<Scenario, { steps: Step[]; verdict: { tone: "ok" | "bad"; text: string } }> = {
  commit: {
    steps: [
      { text: "Coordinator → PREPARE txn#42 to all participants.", kind: "info", coord: "Phase 1: PREPARE" },
      { text: "Orders DB: prepared, locks held → VOTE YES", kind: "ok", set: { i: 0, state: "prepared" } },
      { text: "Inventory DB: prepared → VOTE YES", kind: "ok", set: { i: 1, state: "prepared" } },
      { text: "Payments DB: prepared → VOTE YES", kind: "ok", set: { i: 2, state: "prepared" } },
      { text: "Coordinator: all voted YES → COMMIT to all.", kind: "info", coord: "Phase 2: COMMIT" },
      { text: "All participants COMMIT and release locks.", kind: "ok", setAll: "committed" },
    ],
    verdict: { tone: "ok", text: "Committed atomically — every participant applied the transaction." },
  },
  abort: {
    steps: [
      { text: "Coordinator → PREPARE txn#42 to all participants.", kind: "info", coord: "Phase 1: PREPARE" },
      { text: "Orders DB: prepared → VOTE YES", kind: "ok", set: { i: 0, state: "prepared" } },
      { text: "Inventory DB: prepared → VOTE YES", kind: "ok", set: { i: 1, state: "prepared" } },
      { text: "Payments DB: cannot prepare (insufficient funds) → VOTE NO", kind: "bad", set: { i: 2, state: "aborted" } },
      { text: "Coordinator: a NO vote → ABORT to all.", kind: "warn", coord: "Phase 2: ABORT" },
      { text: "All participants roll back and release locks.", kind: "warn", setAll: "aborted" },
    ],
    verdict: { tone: "ok", text: "Aborted atomically — one NO vote rolls everyone back. No partial commit; the system stays consistent." },
  },
  crash: {
    steps: [
      { text: "Coordinator → PREPARE txn#42 to all participants.", kind: "info", coord: "Phase 1: PREPARE" },
      { text: "Orders DB: prepared, locks held → VOTE YES", kind: "ok", set: { i: 0, state: "prepared" } },
      { text: "Inventory DB: prepared, locks held → VOTE YES", kind: "ok", set: { i: 1, state: "prepared" } },
      { text: "Payments DB: prepared, locks held → VOTE YES", kind: "ok", set: { i: 2, state: "prepared" } },
      { text: "💥 Coordinator crashes before sending Phase 2.", kind: "bad", coord: "CRASHED" },
      { text: "Participants are in-doubt: locks held, can't unilaterally commit or abort.", kind: "bad", setAll: "blocked" },
    ],
    verdict: { tone: "bad", text: "Blocked — participants sit in-doubt holding locks until the coordinator recovers. This is 2PC's fatal flaw." },
  },
};

/**
 * Two-Phase Commit visualization. Phase 1 asks every participant to PREPARE and
 * vote; Phase 2 tells them all to COMMIT (if unanimous) or ABORT. The crash
 * scenario shows the blocking problem that makes 2PC unpopular at scale.
 */
export function TwoPhaseCommitViz() {
  const [scenario, setScenario] = useState<Scenario>("commit");
  const [coord, setCoord] = useState("idle");
  const [states, setStates] = useState<PState[]>(PARTICIPANTS.map(() => "idle"));
  const [log, setLog] = useState<Step[]>([]);
  const [verdict, setVerdict] = useState<(typeof SCENARIOS)[Scenario]["verdict"] | null>(null);
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
    setCoord("idle");
    setStates(PARTICIPANTS.map(() => "idle"));
    setLog([]);
    setVerdict(null);
    setPlaying(false);
  };

  const run = () => {
    clear();
    const sc = SCENARIOS[scenario];
    setCoord("idle");
    setStates(PARTICIPANTS.map(() => "idle"));
    setLog([]);
    setVerdict(null);
    setPlaying(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      if (i >= sc.steps.length) {
        clear();
        setVerdict(sc.verdict);
        setPlaying(false);
        return;
      }
      const step = sc.steps[i];
      if (step.coord) setCoord(step.coord);
      if (step.set) setStates((s) => s.map((v, idx) => (idx === step.set!.i ? step.set!.state : v)));
      if (step.setAll) setStates((s) => s.map((v) => (v === "aborted" ? "aborted" : step.setAll as PState)));
      setLog((l) => [...l, step]);
      i += 1;
    }, 850);
  };

  const pStyle: Record<PState, string> = {
    idle: "border-slate-700 bg-slate-900 text-slate-400",
    prepared: "border-amber-500/50 bg-amber-500/10 text-amber-300",
    committed: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
    aborted: "border-red-500/50 bg-red-500/10 text-red-300",
    blocked: "border-red-500/60 bg-red-500/10 text-red-300",
  };
  const pLabel: Record<PState, string> = { idle: "idle", prepared: "prepared 🔒", committed: "committed ✓", aborted: "aborted ✗", blocked: "in-doubt 🔒" };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="tpc-scenario">
          {(["commit", "abort", "crash"] as Scenario[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScenario(s);
                reset();
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                scenario === s ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {s === "commit" ? "All commit" : s === "abort" ? "One aborts" : "Coordinator crash"}
            </button>
          ))}
        </div>
        <button type="button" onClick={run} disabled={playing} data-tour="tpc-run" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">
          Run
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      <div className="mb-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-center">
        <span className="text-[11px] uppercase tracking-wide text-sky-300">Coordinator</span>
        <span className="ml-2 text-sm font-semibold text-slate-100">{coord}</span>
      </div>

      <div className="grid grid-cols-3 gap-2" data-tour="tpc-participants">
        {PARTICIPANTS.map((name, i) => (
          <div key={name} className={`rounded-lg border p-3 text-center ${pStyle[states[i]]}`}>
            <div className="text-xs font-semibold">{name}</div>
            <div className="mt-0.5 text-[10px]">{pLabel[states[i]]}</div>
          </div>
        ))}
      </div>

      {verdict ? (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            verdict.tone === "ok" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/50 bg-red-500/10 text-red-300"
          }`}
        >
          {verdict.text}
        </div>
      ) : null}

      <div className="mt-3 space-y-1 text-xs">
        {log.length === 0 ? (
          <p className="text-slate-600">Pick a scenario and Run to step through the two phases.</p>
        ) : (
          log.map((s, i) => (
            <p key={i} className={s.kind === "ok" ? "text-emerald-300" : s.kind === "bad" ? "text-red-300" : s.kind === "warn" ? "text-amber-300" : "text-slate-400"}>
              {s.text}
            </p>
          ))
        )}
      </div>
      <GuidedTour tourId="two-phase-commit" steps={TOUR} autoStart={false} />
    </div>
  );
}
