"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "async" | "sync";
const APPLY = 6; // WAL records a replica applies per tick
const N_REPLICAS = 2;

interface State {
  walHead: number; // primary's current LSN (write position)
  applied: number[]; // each replica's applied LSN
}

/**
 * PostgreSQL streaming replication + WAL.
 *
 * Every commit appends a record to the primary's write-ahead log (advancing the
 * LSN). Replicas stream the WAL and apply it, tracking an applied LSN; lag =
 * primary LSN − applied LSN. In async mode the primary commits without waiting
 * (fast, but replicas lag and a failover can lose writes). In sync mode the
 * primary waits for the standby to confirm (no lag on it, lower throughput).
 */
export function PostgresReplicationViz() {
  const [state, setState] = useState<State>({ walHead: 0, applied: Array(N_REPLICAS).fill(0) });
  const [mode, setMode] = useState<Mode>("async");
  const [writeRate, setWriteRate] = useState(9);
  const [running, setRunning] = useState(true);
  const [failed, setFailed] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const modeRef = useRef(mode);
  const rateRef = useRef(writeRate);
  const failedRef = useRef(failed);
  const walRef = useRef(0);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    rateRef.current = writeRate;
  }, [writeRate]);
  useEffect(() => {
    failedRef.current = failed;
  }, [failed]);
  useEffect(() => {
    walRef.current = state.walHead;
  }, [state.walHead]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        const down = failedRef.current;
        const wh = down
          ? prev.walHead
          : modeRef.current === "async"
            ? prev.walHead + rateRef.current
            : prev.walHead + Math.min(rateRef.current, APPLY); // sync throughput gated by the standby
        const applied = prev.applied.map((a, i) => {
          if (i === 0 && modeRef.current === "sync" && !down) return wh; // synchronous standby stays in lockstep
          return Math.min(wh, a + APPLY);
        });
        return { walHead: wh, applied };
      });
    }, 600);
    return () => window.clearInterval(id);
  }, [running]);

  const pushLog = (t: string) => setLog((l) => [t, ...l].slice(0, 4));
  const walAtFailure = useRef(0);

  const failPrimary = () => {
    if (failed) return;
    walAtFailure.current = walRef.current;
    setFailed(true);
    pushLog(`Primary failed at LSN ${walRef.current}. Writes stopped; replicas keep applying buffered WAL.`);
  };
  const promote = () => {
    if (!failed) return;
    setState((prev) => {
      const maxApplied = Math.max(...prev.applied);
      const lost = walAtFailure.current - maxApplied;
      const which = prev.applied.indexOf(maxApplied);
      pushLog(
        lost > 0
          ? `Promoted Replica ${which} (LSN ${maxApplied}) → new primary. ⚠ Lost ${lost} committed writes that hadn't replicated.`
          : `Promoted Replica ${which} (LSN ${maxApplied}) → new primary. No data lost (it was caught up).`,
      );
      return { walHead: maxApplied, applied: prev.applied };
    });
    setFailed(false);
  };
  const reset = () => {
    setState({ walHead: 0, applied: Array(N_REPLICAS).fill(0) });
    setMode("async");
    setWriteRate(9);
    setFailed(false);
    setLog([]);
  };

  const max = Math.max(1, state.walHead);

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          {(["async", "sync"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${mode === m ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>
              {m === "async" ? "Async" : "Sync"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-400">Write</span>
          <input type="range" min={1} max={20} step={1} value={writeRate} onChange={(e) => setWriteRate(Number(e.target.value))} className="w-24 accent-sky-500" />
          <span className="w-10 tabular-nums text-slate-400">{writeRate}/t</span>
        </label>
        {!failed ? (
          <button type="button" onClick={failPrimary} className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20">
            Fail primary
          </button>
        ) : (
          <button type="button" onClick={promote} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20">
            Promote standby
          </button>
        )}
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      {/* primary */}
      <div className={`mb-2 rounded-lg border p-3 ${failed ? "border-red-500/50 bg-red-500/10" : "border-sky-500/40 bg-sky-500/10"}`}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-100">{failed ? "Primary (DOWN)" : "Primary"}</span>
          <span className="font-mono text-xs text-slate-300">WAL head · LSN {state.walHead}</span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded bg-slate-800">
          <div className="h-full rounded bg-sky-500/70" style={{ width: "100%" }} />
        </div>
      </div>

      {/* replicas */}
      <div className="space-y-2">
        {state.applied.map((a, i) => {
          const lag = state.walHead - a;
          const isSync = mode === "sync" && i === 0 && !failed;
          return (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900 p-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Replica {i} {isSync ? <span className="text-emerald-300">· synchronous standby</span> : <span className="text-slate-500">· async</span>}
                </span>
                <span className="font-mono text-slate-400">
                  applied {a} · lag {lag}
                </span>
              </div>
              <div className="relative mt-1 h-3 w-full overflow-hidden rounded bg-slate-800">
                <div className="absolute inset-y-0 left-0 bg-amber-500/40" style={{ width: `${(state.walHead / max) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 rounded bg-emerald-500/70" style={{ width: `${(a / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-amber-300">
        {log.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Green = applied WAL, amber = replication lag. <strong>Async</strong>: the primary commits at full speed and
        replicas fall behind — fail the primary, then promote, to see writes lost. <strong>Sync</strong>: the standby
        stays at lag 0, but write throughput is capped by it.
      </p>
    </div>
  );
}
