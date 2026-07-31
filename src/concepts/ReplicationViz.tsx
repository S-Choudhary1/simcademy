"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Leader–follower replication", body: "Writes go to one leader; followers copy the changes asynchronously — so they lag, and reads can be stale." },
  { target: "[data-tour='rep-write']", title: "Write to the leader", body: "All writes hit the leader at this rate. Followers stream the changes and try to catch up." },
  { target: "[data-tour='rep-followers']", title: "Followers & lag", body: "Each follower shows its version and how far it lags. Add followers to scale read capacity — writes still only go to the leader." },
  { target: "[data-tour='rep-read']", title: "Read a follower", body: "Reads fan out across followers. Read during catch-up and you'll hit a STALE version (eventual consistency)." },
  { target: "[data-tour='rep-fail']", title: "Fail & promote", body: "Fail the leader, then promote the most up-to-date follower. If it was behind, those un-replicated writes are lost — the cost of async replication." },
];

const APPLY = 4; // base catch-up per tick (follower i is a bit slower)
const READ_CAP = 20; // reads/sec a follower can serve
const MAX_FOLLOWERS = 5;

interface State {
  leader: number; // leader version (writes)
  followers: number[]; // each follower's applied version
}

/**
 * Leader-follower replication. All writes go to the leader; followers stream
 * the changes asynchronously (so they lag). Reads fan out across followers,
 * which scales read throughput but can return stale data. On leader failure,
 * the most up-to-date follower is promoted.
 */
export function ReplicationViz() {
  const [state, setState] = useState<State>({ leader: 0, followers: [0, 0] });
  const [writeRate, setWriteRate] = useState(6);
  const [running, setRunning] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reads, setReads] = useState(0);
  const [stale, setStale] = useState(0);
  const [event, setEvent] = useState<string>("Writes go to the leader; followers catch up. Read from a follower to see fresh vs stale.");

  const writeRef = useRef(writeRate);
  const failedRef = useRef(failed);
  const stateRef = useRef(state);
  const leaderAtFailure = useRef(0);
  const rr = useRef(0);
  useEffect(() => {
    writeRef.current = writeRate;
  }, [writeRate]);
  useEffect(() => {
    failedRef.current = failed;
  }, [failed]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        const leader = failedRef.current ? prev.leader : prev.leader + writeRef.current;
        const followers = prev.followers.map((v, i) => Math.min(leader, v + Math.max(1, APPLY - i)));
        return { leader, followers };
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  const read = () => {
    const s = stateRef.current;
    if (s.followers.length === 0) {
      setEvent("No followers to read from.");
      return;
    }
    const i = rr.current % s.followers.length;
    rr.current += 1;
    setReads((r) => r + 1);
    const fv = s.followers[i];
    if (fv < s.leader) {
      setStale((x) => x + 1);
      setEvent(`Read Follower ${i} → v${fv} · STALE (leader is v${s.leader})`);
    } else {
      setEvent(`Read Follower ${i} → v${fv} · fresh ✓`);
    }
  };

  const addFollower = () => {
    if (state.followers.length >= MAX_FOLLOWERS) return;
    setState((s) => ({ ...s, followers: [...s.followers, 0] }));
    setEvent("Added a follower — cold, catching up. Read capacity just went up.");
  };
  const removeFollower = () => {
    if (state.followers.length <= 1) return;
    setState((s) => ({ ...s, followers: s.followers.slice(0, -1) }));
  };
  const failLeader = () => {
    if (failed) return;
    leaderAtFailure.current = stateRef.current.leader;
    setFailed(true);
    setEvent(`Leader failed at v${stateRef.current.leader}. Writes stopped.`);
  };
  const promote = () => {
    if (!failed) return;
    const s = stateRef.current;
    const maxV = Math.max(...s.followers);
    const which = s.followers.indexOf(maxV);
    const lost = leaderAtFailure.current - maxV;
    setState((prev) => ({ ...prev, leader: maxV }));
    setFailed(false);
    setEvent(lost > 0 ? `Promoted Follower ${which} (v${maxV}) → new leader. ⚠ Lost ${lost} un-replicated writes.` : `Promoted Follower ${which} (v${maxV}) → new leader. No data lost.`);
  };
  const reset = () => {
    setState({ leader: 0, followers: [0, 0] });
    setWriteRate(6);
    setFailed(false);
    setReads(0);
    setStale(0);
    setEvent("Writes go to the leader; followers catch up. Read from a follower to see fresh vs stale.");
  };

  const readCap = state.followers.length * READ_CAP;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={read} data-tour="rep-read" className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20">
          Read from follower
        </button>
        <button type="button" onClick={addFollower} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800">
          + Follower
        </button>
        <button type="button" onClick={removeFollower} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800">
          − Follower
        </button>
        {!failed ? (
          <button type="button" onClick={failLeader} data-tour="rep-fail" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20">
            Fail leader
          </button>
        ) : (
          <button type="button" onClick={promote} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20">
            Promote follower
          </button>
        )}
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-300" data-tour="rep-write">
          <span className="text-slate-400">Write</span>
          <input type="range" min={1} max={16} step={1} value={writeRate} onChange={(e) => setWriteRate(Number(e.target.value))} className="w-24 accent-sky-500" />
          <span className="w-10 tabular-nums text-slate-400">{writeRate}/t</span>
        </label>
      </div>

      <div className={`mb-2 rounded-lg border p-3 text-center ${failed ? "border-red-500/50 bg-red-500/10" : "border-sky-500/40 bg-sky-500/10"}`}>
        <span className="text-sm font-semibold text-slate-100">{failed ? "Leader (DOWN)" : "Leader"}</span>
        <span className="ml-2 font-mono text-xs text-slate-300">v{state.leader} · writes only</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" data-tour="rep-followers">
        {state.followers.map((v, i) => {
          const lag = state.leader - v;
          return (
            <div key={i} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-center">
              <div className="text-xs font-semibold text-slate-200">Follower {i}</div>
              <div className="font-mono text-[11px] text-slate-400">
                v{v} · lag {lag}
              </div>
              <div className="text-[10px] text-emerald-300/80">serving reads</div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Read capacity" value={`${readCap}/s`} />
        <Stat label="Reads" value={`${reads}`} />
        <Stat label="Stale reads" value={`${stale}`} tone={stale > 0 ? "warn" : "ok"} />
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-300">{event}</div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Add followers to raise read capacity (writes still only go to the leader). Read during catch-up to hit a stale
        follower. Fail the leader, then promote — if a follower was behind, those writes are lost (async replication).
      </p>
      <GuidedTour tourId="replication" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Stat({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${tone === "warn" ? "text-amber-300" : "text-slate-100"}`}>{value}</div>
    </div>
  );
}
