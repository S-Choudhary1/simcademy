"use client";

import { useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "The CAP theorem", body: "Two replicas that are normally both Consistent and Available. Under a network partition you're forced to give one up." },
  { target: "[data-tour='cap-nodes']", title: "Two replicas", body: "Writes go to A and replicate to B. While connected, a read from B is fresh." },
  { target: "[data-tour='cap-partition']", title: "Cut the network", body: "Partition the link so A and B can no longer sync — now the theorem bites." },
  { target: "[data-tour='cap-mode']", title: "Choose C or A", body: "AP stays available but B can return STALE data. CP rejects requests it can't confirm (unavailable). Write to A, read from B, and watch the trade-off." },
];

type Mode = "CP" | "AP";
interface LogEntry {
  text: string;
  kind: "ok" | "warn" | "bad";
}

/**
 * CAP theorem visualization.
 *
 * Two replicas (A, B). Normally a write to A replicates to B, so reads are
 * consistent AND available. Cut the network (partition) and you must choose:
 *  - AP: keep serving B, but it returns STALE data (available, not consistent).
 *  - CP: reject requests that can't be confirmed (consistent, not available).
 */
export function CapViz() {
  const [valueA, setValueA] = useState(1);
  const [valueB, setValueB] = useState(1);
  const [next, setNext] = useState(2);
  const [partitioned, setPartitioned] = useState(false);
  const [mode, setMode] = useState<Mode>("AP");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastRead, setLastRead] = useState<string | null>(null);

  const push = (text: string, kind: LogEntry["kind"]) => setLog((l) => [{ text, kind }, ...l].slice(0, 6));

  const write = () => {
    const v = next;
    setNext(v + 1);
    if (!partitioned) {
      setValueA(v);
      setValueB(v);
      push(`Write v${v} → A, replicated to B.`, "ok");
    } else if (mode === "AP") {
      setValueA(v);
      push(`Write v${v} → A. B is unreachable — the replicas now diverge.`, "warn");
    } else {
      push(`Write v${v} REJECTED — no quorum during partition (unavailable).`, "bad");
    }
  };

  const readB = () => {
    if (!partitioned) {
      setLastRead(`v${valueB} · fresh`);
      push(`Read B → v${valueB} (fresh).`, "ok");
    } else if (mode === "AP") {
      const stale = valueB !== valueA;
      setLastRead(`v${valueB}${stale ? " · STALE" : ""}`);
      push(`Read B → v${valueB}${stale ? ` — STALE (A already has v${valueA})` : ""} (stayed available).`, stale ? "warn" : "ok");
    } else {
      setLastRead("unavailable");
      push("Read B REJECTED — CP refuses possibly-stale data (unavailable).", "bad");
    }
  };

  const reset = () => {
    setValueA(1);
    setValueB(1);
    setNext(2);
    setPartitioned(false);
    setLog([]);
    setLastRead(null);
  };

  const diverged = valueA !== valueB;
  const banner = !partitioned
    ? { text: "Connected → Consistent ✓ and Available ✓", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" }
    : mode === "AP"
      ? { text: "Partition + AP → Available ✓, Consistent ✗ (reads can be stale)", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" }
      : { text: "Partition + CP → Consistent ✓, Available ✗ (requests rejected)", cls: "border-red-500/40 bg-red-500/10 text-red-300" };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* nodes + link */}
      <div className="flex items-center justify-center gap-3" data-tour="cap-nodes">
        <NodeCard label="Node A" value={valueA} accent="sky" note="write here" />
        <div className="flex flex-col items-center">
          <span className={`text-xl ${partitioned ? "text-red-400" : "text-emerald-400"}`}>
            {partitioned ? "✂" : "↔"}
          </span>
          <span className={`text-[10px] ${partitioned ? "text-red-400" : "text-slate-500"}`}>
            {partitioned ? "partitioned" : "replicating"}
          </span>
        </div>
        <NodeCard label="Node B" value={valueB} accent={diverged && partitioned ? "amber" : "sky"} note="read here" />
      </div>

      <div className={`mt-3 rounded-lg border px-3 py-2 text-center text-sm ${banner.cls}`}>{banner.text}</div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPartitioned((p) => !p)}
          data-tour="cap-partition"
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
            partitioned
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
          }`}
        >
          {partitioned ? "Heal network" : "Partition network"}
        </button>

        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="cap-mode">
          {(["AP", "CP"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                mode === m ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {m === "AP" ? "AP (available)" : "CP (consistent)"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={write}
          className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          Write to A
        </button>
        <button
          type="button"
          onClick={readB}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Read from B
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset
        </button>
      </div>

      {lastRead ? (
        <p className="mt-2 text-sm text-slate-300">
          Last read from B: <span className="font-semibold text-slate-100">{lastRead}</span>
        </p>
      ) : null}

      <div className="mt-2 space-y-1 text-xs">
        {log.length === 0 ? (
          <p className="text-slate-600">Partition the network, pick CP or AP, then write to A and read from B.</p>
        ) : (
          log.map((e, i) => (
            <p key={i} className={e.kind === "ok" ? "text-slate-400" : e.kind === "warn" ? "text-amber-300" : "text-red-300"}>
              {e.text}
            </p>
          ))
        )}
      </div>
      <GuidedTour tourId="cap" steps={TOUR} autoStart={false} />
    </div>
  );
}

function NodeCard({ label, value, accent, note }: { label: string; value: number; accent: "sky" | "amber"; note: string }) {
  const cls = accent === "amber" ? "border-amber-500/40 bg-amber-500/10" : "border-sky-500/40 bg-sky-500/10";
  return (
    <div className={`w-32 rounded-lg border p-3 text-center ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-100">v{value}</div>
      <div className="mt-1 text-[10px] text-slate-500">{note}</div>
    </div>
  );
}
