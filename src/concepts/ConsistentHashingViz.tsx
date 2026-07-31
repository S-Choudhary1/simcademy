"use client";

import { useMemo, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Consistent hashing", body: "Keys and nodes sit on a ring; each key is owned by the next node clockwise. The trick: adding a node barely disturbs anything." },
  { target: "[data-tour='ch-ring']", title: "The ring", body: "16 keys (small dots) and the nodes (large dots), all placed by hash. Each key is coloured by the node that owns it." },
  { target: "[data-tour='ch-add']", title: "Add / remove a node", body: "Only the keys in the new node's arc move — everything else stays put." },
  { target: "[data-tour='ch-msg']", title: "Compare to modulo", body: "The readout shows how few keys consistent hashing moves versus plain modulo hashing, which reshuffles almost everything." },
];

const CX = 160;
const CY = 160;
const R = 120;
const KEYS = Array.from({ length: 16 }, (_, i) => `key-${i}`);
const COLORS = ["#38bdf8", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb923c", "#22d3ee"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const angleOf = (s: string) => hash(s) % 360;
const pointFor = (deg: number, r = R) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

/** Assign each key to the first node clockwise from it on the ring. */
function assign(nodes: string[]): Record<string, string> {
  const ring = nodes.map((n) => ({ n, a: angleOf(n) })).sort((x, y) => x.a - y.a);
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    const ka = angleOf(k);
    const owner = ring.find((r) => r.a >= ka) ?? ring[0];
    out[k] = owner.n;
  }
  return out;
}

function moduloMoved(from: number, to: number): number {
  let moved = 0;
  for (let i = 0; i < KEYS.length; i++) if (i % from !== i % to) moved++;
  return moved;
}

/**
 * Consistent Hashing on a ring. Keys and nodes are placed by hash; each key is
 * owned by the next node clockwise. Adding/removing a node only reassigns the
 * keys in that node's arc — unlike modulo hashing, which reshuffles almost
 * everything. The readout compares the two.
 */
export function ConsistentHashingViz() {
  const [nodes, setNodes] = useState(["A", "B", "C"]);
  const [msg, setMsg] = useState<string | null>(null);

  const assignment = useMemo(() => assign(nodes), [nodes]);
  const colorFor = (name: string) => COLORS[nodes.indexOf(name) % COLORS.length];

  const addNode = () => {
    const name = String.fromCharCode(65 + nodes.length);
    const next = [...nodes, name];
    const before = assignment;
    const after = assign(next);
    const moved = KEYS.filter((k) => before[k] !== after[k]).length;
    const mod = moduloMoved(nodes.length, next.length);
    setNodes(next);
    setMsg(`Added node ${name}: consistent hashing moved ${moved}/${KEYS.length} keys — modulo hashing would have moved ${mod}/${KEYS.length}.`);
  };

  const removeNode = () => {
    if (nodes.length <= 2) return;
    const next = nodes.slice(0, -1);
    const removed = nodes[nodes.length - 1];
    const before = assignment;
    const after = assign(next);
    const moved = KEYS.filter((k) => before[k] !== after[k]).length;
    const mod = moduloMoved(nodes.length, next.length);
    setNodes(next);
    setMsg(`Removed node ${removed}: consistent hashing moved ${moved}/${KEYS.length} keys — modulo hashing would have moved ${mod}/${KEYS.length}.`);
  };

  const reset = () => {
    setNodes(["A", "B", "C"]);
    setMsg(null);
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
        <svg viewBox="0 0 320 320" className="mx-auto h-auto w-full max-w-[320px]" role="img" aria-label="Hash ring" data-tour="ch-ring">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth={2} />
          {KEYS.map((k) => {
            const p = pointFor(angleOf(k));
            return <circle key={k} cx={p.x} cy={p.y} r={4} fill={colorFor(assignment[k])} opacity={0.9} />;
          })}
          {nodes.map((n) => {
            const p = pointFor(angleOf(n));
            const lp = pointFor(angleOf(n), R + 18);
            return (
              <g key={n}>
                <circle cx={p.x} cy={p.y} r={8} fill={colorFor(n)} stroke="#0f172a" strokeWidth={2} />
                <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="#e2e8f0">
                  {n}
                </text>
              </g>
            );
          })}
        </svg>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={addNode} data-tour="ch-add" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              Add node
            </button>
            <button type="button" onClick={removeNode} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
              Remove node
            </button>
            <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
              Reset
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {nodes.map((n) => {
              const count = KEYS.filter((k) => assignment[k] === n).length;
              return (
                <span key={n} className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(n) }} />
                  Node {n}: {count} keys
                </span>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300" data-tour="ch-msg">
            {msg ?? "Add or remove a node and watch how few keys move — that's the point of consistent hashing."}
          </div>
        </div>
      </div>
      <GuidedTour tourId="consistent-hashing" steps={TOUR} autoStart={false} />
    </div>
  );
}
