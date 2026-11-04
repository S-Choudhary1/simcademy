"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Raft consensus", body: "Five servers keep one shared log in sync, even through crashes. Here's how to drive the simulation." },
  { target: "[data-tour='raft-play']", title: "Run it", body: "Play/Pause the clock. The leader sends heartbeats every tick to keep the followers in line." },
  { target: "[data-tour='raft-append']", title: "Append a command", body: "Add a log entry on the leader. It replicates to followers and turns green once a MAJORITY store it — that's 'committed'." },
  { target: "[data-tour='raft-servers']", title: "Crash a server", body: "Click any server to crash or recover it. Crash the leader and watch a follower time out, run an election, and take over at a new term. Crash 3 of 5 and the cluster loses quorum." },
  { target: "[data-tour='raft-events']", title: "Follow along", body: "The play-by-play: elections, term changes, and commits — narrated as they happen." },
];

/* ================================================================== *
 * Raft consensus — leader election + log replication over 5 servers.
 * Rules (Raft paper, Ongaro & Ousterhout):
 *   • Servers are follower / candidate / leader. A follower that hears
 *     no heartbeat before its election timeout becomes a candidate,
 *     bumps the term, and requests votes; a MAJORITY makes it leader.
 *   • Clients append to the leader; it replicates to followers. An
 *     entry is COMMITTED once stored on a majority of servers.
 * Simplified for teaching: shared log (no conflict-repair), staggered
 * timeouts so one candidate wins cleanly (no split votes).
 * ================================================================== */

const N = 5;
const MAJORITY = Math.floor(N / 2) + 1; // 3

type SState = "follower" | "candidate" | "leader";
interface Server { id: number; state: SState; term: number; logLen: number; crashed: boolean; timeout: number; elapsed: number }
interface Entry { term: number; cmd: string }
interface Sim { servers: Server[]; log: Entry[]; events: string[] }

const initial = (): Sim => ({
  servers: Array.from({ length: N }, (_, id) => ({ id, state: id === 0 ? "leader" : "follower", term: 1, logLen: 0, crashed: false, timeout: 3 + id, elapsed: 0 })),
  log: [],
  events: ["Term 1 — S0 elected leader"],
});

function step(s: Sim): Sim {
  const servers = s.servers.map((x) => ({ ...x }));
  let events = s.events;
  const leader = servers.find((x) => x.state === "leader" && !x.crashed);

  if (leader) {
    // heartbeat + replicate one entry/tick to each alive follower
    for (const x of servers) {
      if (x.id === leader.id) { x.logLen = s.log.length; continue; }
      if (x.crashed) continue;
      x.state = "follower";
      x.term = leader.term;
      x.elapsed = 0;
      if (x.logLen < s.log.length) x.logLen += 1;
    }
    return { servers, log: s.log, events };
  }

  // no leader → run election timers
  for (const x of servers) if (!x.crashed) x.elapsed += 1;
  const ready = servers.filter((x) => !x.crashed && x.state !== "leader" && x.elapsed >= x.timeout).sort((a, b) => a.timeout - b.timeout);
  if (ready.length) {
    const cand = servers.find((x) => x.id === ready[0].id)!;
    const newTerm = Math.max(...servers.map((x) => x.term)) + 1;
    const alive = servers.filter((x) => !x.crashed).length; // all alive grant (single candidate, log ok)
    cand.state = "candidate";
    cand.term = newTerm;
    if (alive >= MAJORITY) {
      for (const x of servers) {
        if (x.crashed) continue;
        x.term = newTerm;
        x.elapsed = 0;
        x.state = x.id === cand.id ? "leader" : "follower";
      }
      events = [`Term ${newTerm} — S${cand.id} timed out → candidate, won ${alive}/${N} votes → leader`, ...events].slice(0, 6);
    } else {
      cand.elapsed = 0;
      events = [`Term ${newTerm} — S${cand.id} is candidate, but only ${alive} alive < majority ${MAJORITY} → no leader, cluster unavailable`, ...events].slice(0, 6);
    }
  }
  return { servers, log: s.log, events };
}

export function RaftViz() {
  const [sim, setSim] = useState<Sim>(initial);
  const [running, setRunning] = useState(true);
  const runRef = useRef(running);
  useEffect(() => { runRef.current = running; }, [running]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!runRef.current) return;
      setSim((prev) => step(prev));
    }, 750);
    return () => window.clearInterval(id);
  }, []);

  const { servers, log, events } = sim;
  const leader = servers.find((x) => x.state === "leader" && !x.crashed);
  // commitLen = longest prefix stored on a majority of servers
  let commitLen = 0;
  for (let L = 1; L <= log.length; L++) {
    if (servers.filter((x) => x.logLen >= L).length >= MAJORITY) commitLen = L;
    else break;
  }
  const aliveCount = servers.filter((x) => !x.crashed).length;

  const append = () =>
    setSim((prev) => {
      const ldr = prev.servers.find((x) => x.state === "leader" && !x.crashed);
      if (!ldr) return prev;
      const cmd = `x${prev.log.length + 1}`;
      const nlog = [...prev.log, { term: ldr.term, cmd }];
      const servers2 = prev.servers.map((x) => (x.id === ldr.id ? { ...x, logLen: nlog.length } : x));
      return { ...prev, log: nlog, servers: servers2, events: [`S${ldr.id} (leader) appended "${cmd}" @term ${ldr.term} — replicating…`, ...prev.events].slice(0, 6) };
    });

  const toggleCrash = (id: number) =>
    setSim((prev) => {
      const target = prev.servers.find((x) => x.id === id)!;
      const recovering = target.crashed;
      const wasLeader = target.state === "leader" && !target.crashed;
      const servers2 = prev.servers.map((x) =>
        x.id === id ? (recovering ? { ...x, crashed: false, state: "follower" as SState, elapsed: 0 } : { ...x, crashed: true }) : x,
      );
      const ev = recovering ? `S${id} recovered → rejoins as follower, catches up` : `S${id} crashed${wasLeader ? " (was leader) → followers will start an election" : ""}`;
      return { ...prev, servers: servers2, events: [ev, ...prev.events].slice(0, 6) };
    });

  const reset = () => setSim(initial());

  const STATE_STYLE: Record<SState, { ring: string; badge: string; label: string }> = {
    leader: { ring: "border-emerald-500/70", badge: "bg-emerald-500/20 text-emerald-300", label: "LEADER" },
    candidate: { ring: "border-amber-500/70", badge: "bg-amber-500/20 text-amber-300", label: "CANDIDATE" },
    follower: { ring: "border-slate-700", badge: "bg-slate-800 text-slate-400", label: "follower" },
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} data-tour="raft-play" className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={append} disabled={!leader} data-tour="raft-append" className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-40">
          + Append entry
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
        <span className="ml-auto text-xs text-slate-500">majority = <span className="font-mono text-slate-300">{MAJORITY}</span> of {N} · <span className="text-slate-400">click a server to crash / recover</span></span>
      </div>

      {!leader ? (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-300">
          No leader — election in progress{aliveCount < MAJORITY ? ` · only ${aliveCount} servers alive (< ${MAJORITY}), no quorum` : ""}
        </div>
      ) : null}

      {/* servers */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-tour="raft-servers">
        {servers.map((x) => {
          const st = STATE_STYLE[x.crashed ? "follower" : x.state];
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => toggleCrash(x.id)}
              className={`rounded-lg border p-2.5 text-left transition ${x.crashed ? "border-red-500/50 bg-red-500/5 opacity-60" : st.ring + " bg-slate-900/50 hover:bg-slate-900"}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">S{x.id}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${x.crashed ? "bg-red-500/20 text-red-300" : st.badge}`}>{x.crashed ? "DOWN" : st.label}</span>
              </div>
              <div className="mb-1.5 text-[10px] text-slate-500">term <span className="font-mono text-slate-300">{x.term}</span></div>
              <div className="flex min-h-[20px] flex-wrap gap-0.5">
                {Array.from({ length: x.logLen }, (_, i) => {
                  const committed = i < commitLen;
                  return (
                    <span key={i} title={`${log[i]?.cmd} @term ${log[i]?.term}`} className={`flex h-4 w-4 items-center justify-center rounded-sm text-[8px] font-mono ${committed ? "bg-emerald-500/70 text-slate-950" : "bg-amber-500/50 text-slate-900"}`}>
                      {i + 1}
                    </span>
                  );
                })}
                {x.logLen === 0 ? <span className="text-[9px] italic text-slate-600">empty log</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500/70" /> committed ({commitLen})</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-500/50" /> uncommitted</span>
        <span>log length: <span className="font-mono text-slate-300">{log.length}</span></span>
      </div>

      {/* events */}
      <div className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-[11px] leading-snug" data-tour="raft-events">
        {events.map((e, i) => (
          <p key={i} className={i === 0 ? "text-sky-300" : "text-sky-300/50"}>{e}</p>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Try it: <strong className="text-slate-400">Crash the leader</strong>{" "}(click it) — after a follower&rsquo;s election
        timeout, it becomes a candidate, wins a majority of votes, and takes over at a higher term.{" "}
        <strong className="text-slate-400">Append entries</strong>{" "}and watch them go amber→green as they reach a majority
        (committed). Crash servers until fewer than {MAJORITY} remain and the cluster loses quorum — nothing commits.
      </p>
      <GuidedTour tourId="raft" steps={TOUR} autoStart={false} />
    </div>
  );
}
