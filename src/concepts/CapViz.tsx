"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "The CAP theorem", body: "A client talks to two replicas that are normally both Consistent and Available. Under a network partition you're forced to give one up." },
  { target: "[data-tour='cap-nodes']", title: "Client + two replicas", body: "The client writes to A (which replicates to B) and reads from B. Watch the request packet travel." },
  { target: "[data-tour='cap-partition']", title: "Cut the network", body: "Partition the A↔B link so the replicas can't sync — now the theorem bites." },
  { target: "[data-tour='cap-mode']", title: "Choose C or A", body: "AP stays available but B can return STALE data. CP rejects requests it can't confirm. Write, then read, and watch the packet succeed or fail." },
];

type Mode = "CP" | "AP";
type Tone = "write" | "read" | "fail";
interface LogEntry { text: string; kind: "ok" | "warn" | "bad" }

// packet x-positions (% across the diagram), roughly aligned to the node cards
const X = { client: 11, a: 50, b: 88, cut: 69 };

export function CapViz() {
  const [valueA, setValueA] = useState(1);
  const [valueB, setValueB] = useState(1);
  const [next, setNext] = useState(2);
  const [partitioned, setPartitioned] = useState(false);
  const [mode, setMode] = useState<Mode>("AP");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastRead, setLastRead] = useState<string | null>(null);
  const [packet, setPacket] = useState<{ x: number; tone: Tone } | null>(null);

  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => clearTimers(), []);

  const push = (text: string, kind: LogEntry["kind"]) => setLog((l) => [{ text, kind }, ...l].slice(0, 6));

  const write = () => {
    if (packet) return;
    clearTimers();
    const v = next;
    setNext(v + 1);
    setPacket({ x: X.client, tone: "write" });
    at(30, () => setPacket({ x: X.a, tone: "write" })); // client → A
    if (!partitioned) {
      at(560, () => setValueA(v));
      at(620, () => setPacket({ x: X.b, tone: "write" })); // A → B (replicate)
      at(1180, () => setValueB(v));
      at(1260, () => { setPacket(null); push(`Write v${v} → A → replicated to B. Consistent & available.`, "ok"); });
    } else if (mode === "AP") {
      at(560, () => setValueA(v)); // A accepts locally
      at(620, () => setPacket({ x: X.cut, tone: "fail" })); // replication stalls at the cut
      at(1160, () => { setPacket(null); push(`Write v${v} → A. B unreachable — replicas diverge (available, not consistent).`, "warn"); });
    } else {
      at(560, () => setPacket({ x: X.client, tone: "fail" })); // A can't get quorum → reject
      at(1080, () => { setPacket(null); push(`Write v${v} REJECTED — CP needs a quorum it can't reach (consistent, not available).`, "bad"); });
    }
  };

  const readB = () => {
    if (packet) return;
    clearTimers();
    setPacket({ x: X.client, tone: "read" });
    at(30, () => setPacket({ x: X.b, tone: "read" })); // client → B
    const cpBlocked = partitioned && mode === "CP";
    at(560, () => {
      if (!partitioned) setLastRead(`v${valueB} · fresh`);
      else if (mode === "AP") setLastRead(`v${valueB}${valueB !== valueA ? " · STALE" : ""}`);
      else setLastRead("unavailable");
    });
    at(620, () => setPacket({ x: X.client, tone: cpBlocked ? "fail" : "read" })); // response back
    at(1160, () => {
      setPacket(null);
      if (!partitioned) push(`Read B → v${valueB} (fresh).`, "ok");
      else if (mode === "AP") { const stale = valueB !== valueA; push(`Read B → v${valueB}${stale ? ` — STALE (A has v${valueA})` : ""} (stayed available).`, stale ? "warn" : "ok"); }
      else push("Read B REJECTED — CP refuses possibly-stale data (unavailable).", "bad");
    });
  };

  const reset = () => {
    clearTimers();
    setValueA(1); setValueB(1); setNext(2); setPartitioned(false); setLog([]); setLastRead(null); setPacket(null);
  };

  const diverged = valueA !== valueB;
  const banner = !partitioned
    ? { text: "Connected → Consistent ✓ and Available ✓", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" }
    : mode === "AP"
      ? { text: "Partition + AP → Available ✓, Consistent ✗ (reads can be stale)", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" }
      : { text: "Partition + CP → Consistent ✓, Available ✗ (requests rejected)", cls: "border-red-500/40 bg-red-500/10 text-red-300" };
  const busy = packet !== null;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* client + two replicas + travelling packet */}
      <div className="overflow-x-auto">
        <div className="relative min-w-[460px]" data-tour="cap-nodes">
          <div className="flex items-center justify-between gap-2">
            <NodeCard label="Client" value={null} accent="violet" note="reads & writes" />
            <span className="text-slate-600">→</span>
            <NodeCard label="Node A" value={valueA} accent="sky" note="write here" />
            <div className="flex flex-col items-center px-1">
              <span className={`text-xl ${partitioned ? "text-red-400" : "text-emerald-400"}`}>{partitioned ? "✂" : "↔"}</span>
              <span className={`text-[10px] ${partitioned ? "text-red-400" : "text-slate-500"}`}>{partitioned ? "partitioned" : "replicating"}</span>
            </div>
            <NodeCard label="Node B" value={valueB} accent={diverged && partitioned ? "amber" : "sky"} note="read here" />
          </div>
          {packet ? (
            <div
              className="pointer-events-none absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg transition-[left] duration-500 ease-in-out"
              style={{ left: `${packet.x}%`, background: packet.tone === "fail" ? "#f87171" : packet.tone === "read" ? "#34d399" : "#38bdf8", boxShadow: "0 0 8px currentColor" }}
            />
          ) : null}
        </div>
      </div>

      <div className={`mt-3 rounded-lg border px-3 py-2 text-center text-sm ${banner.cls}`}>{banner.text}</div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setPartitioned((p) => !p)} data-tour="cap-partition" className={`rounded-md border px-3 py-1.5 text-sm font-medium ${partitioned ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>
          {partitioned ? "Heal network" : "Partition network"}
        </button>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="cap-mode">
          {(["AP", "CP"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${mode === m ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>
              {m === "AP" ? "AP (available)" : "CP (consistent)"}
            </button>
          ))}
        </div>
        <button type="button" onClick={write} disabled={busy} className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">Write to A</button>
        <button type="button" onClick={readB} disabled={busy} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50">Read from B</button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
      </div>

      {lastRead ? <p className="mt-2 text-sm text-slate-300">Last read from B: <span className="font-semibold text-slate-100">{lastRead}</span></p> : null}

      <div className="mt-2 space-y-1 text-xs">
        {log.length === 0 ? (
          <p className="text-slate-600">Partition the network, pick CP or AP, then write to A and read from B — watch the packet.</p>
        ) : (
          log.map((e, i) => (<p key={i} className={e.kind === "ok" ? "text-slate-400" : e.kind === "warn" ? "text-amber-300" : "text-red-300"}>{e.text}</p>))
        )}
      </div>
      <GuidedTour tourId="cap" steps={TOUR} autoStart={false} />
    </div>
  );
}

function NodeCard({ label, value, accent, note }: { label: string; value: number | null; accent: "sky" | "amber" | "violet"; note: string }) {
  const cls = accent === "amber" ? "border-amber-500/40 bg-amber-500/10" : accent === "violet" ? "border-violet-500/40 bg-violet-500/10" : "border-sky-500/40 bg-sky-500/10";
  return (
    <div className={`w-28 shrink-0 rounded-lg border p-3 text-center ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      {value !== null ? <div className="mt-1 text-2xl font-bold tabular-nums text-slate-100">v{value}</div> : <div className="mt-1 text-2xl">🧑‍💻</div>}
      <div className="mt-1 text-[10px] text-slate-500">{note}</div>
    </div>
  );
}
