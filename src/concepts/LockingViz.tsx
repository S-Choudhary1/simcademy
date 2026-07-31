"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Locking & concurrency", body: "Two requests each read $100, add $50, and write back. What the account ends up at depends entirely on how you handle concurrency." },
  { target: "[data-tour='lock-mode']", title: "Choose a strategy", body: "No lock, optimistic (version check + retry), or pessimistic (SELECT … FOR UPDATE)." },
  { target: "[data-tour='lock-run']", title: "Run it", body: "Step through the two requests interleaving against the same row." },
  { target: "[data-tour='lock-row']", title: "Watch the row", body: "No lock → a lost update ($150, not $200). Optimistic → the version check rejects the stale write and B retries. Pessimistic → the lock serializes them (B waits). Both correct ones reach $200." },
];

type Mode = "none" | "optimistic" | "pessimistic";
interface DbState {
  balance: number;
  version: number;
  locked: boolean;
}
interface Step {
  text: string;
  kind: "info" | "ok" | "warn" | "bad";
  patch: Partial<DbState>;
}
const INIT: DbState = { balance: 100, version: 1, locked: false };

const SCENARIOS: Record<Mode, { steps: Step[]; verdict: { tone: "ok" | "bad"; text: string } }> = {
  none: {
    steps: [
      { text: "A: SELECT balance → 100 (version 1)", kind: "info", patch: {} },
      { text: "B: SELECT balance → 100 (version 1)", kind: "info", patch: {} },
      { text: "A: UPDATE accounts SET balance = 150", kind: "ok", patch: { balance: 150, version: 2 } },
      { text: "B: UPDATE accounts SET balance = 150  ← overwrites A (lost update)", kind: "bad", patch: { balance: 150, version: 3 } },
    ],
    verdict: { tone: "bad", text: "Lost update: both added $50, but the balance is $150 instead of $200. A's write vanished." },
  },
  optimistic: {
    steps: [
      { text: "A: SELECT balance → 100 (version 1)", kind: "info", patch: {} },
      { text: "B: SELECT balance → 100 (version 1)", kind: "info", patch: {} },
      { text: "A: UPDATE … SET balance=150, version=2 WHERE version=1 → 1 row ✓", kind: "ok", patch: { balance: 150, version: 2 } },
      { text: "B: UPDATE … WHERE version=1 → 0 rows ✗  (version is now 2) — conflict!", kind: "warn", patch: {} },
      { text: "B: retry → SELECT balance → 150 (version 2)", kind: "info", patch: {} },
      { text: "B: UPDATE … SET balance=200, version=3 WHERE version=2 → 1 row ✓", kind: "ok", patch: { balance: 200, version: 3 } },
    ],
    verdict: { tone: "ok", text: "Correct: the version check caught the stale write; B retried on fresh data → $200." },
  },
  pessimistic: {
    steps: [
      { text: "A: SELECT … FOR UPDATE → acquires lock (balance 100)", kind: "ok", patch: { locked: true } },
      { text: "B: SELECT … FOR UPDATE → blocks, waiting for the lock…", kind: "warn", patch: {} },
      { text: "A: UPDATE balance = 150; COMMIT → releases lock", kind: "ok", patch: { balance: 150, version: 2, locked: false } },
      { text: "B: acquires lock, SELECT balance → 150", kind: "ok", patch: { locked: true } },
      { text: "B: UPDATE balance = 200; COMMIT → releases lock", kind: "ok", patch: { balance: 200, version: 3, locked: false } },
    ],
    verdict: { tone: "ok", text: "Correct: the lock serialized the writers, so nothing was lost → $200. Cost: B had to wait." },
  },
};

/**
 * Locking visualization. Two requests each read the balance, add $50, and write
 * it back. Without a lock the second write clobbers the first (lost update);
 * optimistic locking retries on a version conflict; pessimistic locking
 * serializes them.
 */
export function LockingViz() {
  const [mode, setMode] = useState<Mode>("none");
  const [db, setDb] = useState<DbState>(INIT);
  const [log, setLog] = useState<Step[]>([]);
  const [verdict, setVerdict] = useState<(typeof SCENARIOS)[Mode]["verdict"] | null>(null);
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
    setDb(INIT);
    setLog([]);
    setVerdict(null);
    setPlaying(false);
  };

  const run = () => {
    clear();
    const sc = SCENARIOS[mode];
    setDb(INIT);
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
      setDb((d) => ({ ...d, ...step.patch }));
      setLog((l) => [...l, step]);
      i += 1;
    }, 850);
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="lock-mode">
          {(["none", "optimistic", "pessimistic"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                reset();
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                mode === m ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {m === "none" ? "No lock" : m === "optimistic" ? "Optimistic" : "Pessimistic"}
            </button>
          ))}
        </div>
        <button type="button" onClick={run} disabled={playing} data-tour="lock-run" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">
          Run
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      <div className="flex items-center justify-center gap-3" data-tour="lock-row">
        <Writer label="Request A" />
        <div className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-center">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">accounts row</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-slate-100">${db.balance}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            version {db.version} {db.locked ? "· 🔒 locked" : ""}
          </div>
        </div>
        <Writer label="Request B" />
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

      <div className="mt-3 space-y-1 font-mono text-xs">
        {log.length === 0 ? (
          <p className="text-slate-600">Both requests add $50 to a $100 balance. Run to see what the balance ends up as.</p>
        ) : (
          log.map((s, i) => (
            <p key={i} className={s.kind === "ok" ? "text-emerald-300" : s.kind === "bad" ? "text-red-300" : s.kind === "warn" ? "text-amber-300" : "text-slate-400"}>
              {s.text}
            </p>
          ))
        )}
      </div>
      <GuidedTour tourId="locking" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Writer({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center">
      <div className="text-xs font-semibold text-slate-200">{label}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">read +$50 write</div>
    </div>
  );
}
