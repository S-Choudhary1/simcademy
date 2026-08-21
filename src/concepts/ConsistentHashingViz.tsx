"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Consistent hashing", body: "Keys and servers sit on a ring; each key is owned by the first server clockwise from it. Adding a server barely disturbs anything." },
  { target: "[data-tour='ch-ring']", title: "The ring", body: "16 keys (small dots) and the servers (lettered dots), placed by hash. Each key is coloured by the server that owns it." },
  { target: "[data-tour='ch-test']", title: "Trace a key", body: "Pick a key and hit Trace — watch it walk clockwise to the server that owns it." },
  { target: "[data-tour='ch-add']", title: "Add / remove a server", body: "The keys that move get outlined, and the readout counts them — usually only ~1/N of all keys, versus almost all with plain modulo hashing." },
  { target: "[data-tour='ch-vnodes']", title: "Virtual nodes", body: "Placing each server at several ring points (vnodes) balances the load and spreads a removed server's keys across many others instead of dumping them on one neighbour." },
];

const CX = 160, CY = 160, R = 116, KR = 90; // R = server ring, KR = inner key ring
const KEYS = Array.from({ length: 16 }, (_, i) => `key-${i}`);
const COLORS = ["#38bdf8", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb923c", "#22d3ee"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  // murmur3 fmix32 finalizer so a single trailing-char change avalanches into
  // the high bits — otherwise "key-0"…"key-15" clump into a couple of arcs.
  h ^= h >>> 16; h = Math.imul(h, 2246822507);
  h ^= h >>> 13; h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}
// Map the FULL 32-bit hash around the circle (not hash % 360, which folds away
// the well-distributed high bits and clusters everything).
const angleOf = (s: string) => (hash(s) / 4294967296) * 360;
const pointFor = (deg: number, r = R) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};
function arcPath(a1: number, a2: number): string {
  const p1 = pointFor(a1), p2 = pointFor(a2);
  const large = (a2 - a1 + 360) % 360 > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y}`;
}

interface RingPos { n: string; a: number }
function assignFull(nodes: string[], vnodes: number) {
  const ring: RingPos[] = [];
  for (const n of nodes) for (let i = 0; i < vnodes; i++) ring.push({ n, a: angleOf(`${n}#${i}`) });
  ring.sort((x, y) => x.a - y.a);
  const owner: Record<string, string> = {};
  const ownerAngle: Record<string, number> = {};
  for (const k of KEYS) {
    const ka = angleOf(k);
    const pos = ring.find((r) => r.a >= ka) ?? ring[0];
    owner[k] = pos.n;
    ownerAngle[k] = pos.a;
  }
  return { owner, ownerAngle, ring };
}
function moduloMoved(from: number, to: number): number {
  let moved = 0;
  for (let i = 0; i < KEYS.length; i++) if (i % from !== i % to) moved++;
  return moved;
}

interface Trace { key: string; owner: string; from: number; to: number; angle: number; done: boolean }

export function ConsistentHashingViz() {
  const [nodes, setNodes] = useState(["A", "B", "C"]);
  const [vnodes, setVnodes] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [testKey, setTestKey] = useState(KEYS[7]);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [moved, setMoved] = useState<string[]>([]);
  const timer = useRef<number | null>(null);
  const clearT = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };
  useEffect(() => () => clearT(), []);

  const model = useMemo(() => assignFull(nodes, vnodes), [nodes, vnodes]);
  const colorFor = (name: string) => COLORS[nodes.indexOf(name) % COLORS.length];

  // Keep angular positions honest (they decide ownership) but nudge keys that
  // land within a few degrees onto inner radii, so none hide behind each other.
  const keyLayout = useMemo(() => {
    const sorted = KEYS.map((k) => ({ k, a: angleOf(k) })).sort((x, y) => x.a - y.a);
    const lastAtLevel: number[] = [];
    const out: Record<string, { a: number; r: number }> = {};
    for (const it of sorted) {
      let level = 0;
      while (lastAtLevel[level] !== undefined && it.a - lastAtLevel[level] < 9) level++;
      lastAtLevel[level] = it.a;
      out[it.k] = { a: it.a, r: KR - level * 13 };
    }
    return out;
  }, []);

  const runTrace = () => {
    clearT();
    setMsg(null); setMoved([]);
    const key = testKey, owner = model.owner[key];
    const from = angleOf(key), to = model.ownerAngle[key];
    const dist = (to - from + 360) % 360;
    setTrace({ key, owner, from, to, angle: from, done: dist < 0.5 });
    if (dist < 0.5) return;
    const stepDeg = Math.max(3, dist / 24);
    let traveled = 0;
    const tick = () => {
      traveled += stepDeg;
      if (traveled >= dist) { setTrace((t) => (t ? { ...t, angle: t.to, done: true } : t)); timer.current = null; }
      else { setTrace((t) => (t ? { ...t, angle: (from + traveled) % 360 } : t)); timer.current = window.setTimeout(tick, 40); }
    };
    timer.current = window.setTimeout(tick, 40);
  };

  const mutate = (nextNodes: string[], verb: string, name: string) => {
    clearT(); setTrace(null);
    const after = assignFull(nextNodes, vnodes).owner;
    const movedKeys = KEYS.filter((k) => model.owner[k] !== after[k]);
    const mod = moduloMoved(nodes.length, nextNodes.length);
    setNodes(nextNodes);
    setMoved(movedKeys);
    setMsg(`${verb} server ${name}: ${movedKeys.length}/${KEYS.length} keys re-hashed. Plain hash % N would re-hash ${mod}/${KEYS.length}.`);
    timer.current = window.setTimeout(() => setMoved([]), 2200);
  };
  const addNode = () => { const n = String.fromCharCode(65 + nodes.length); mutate([...nodes, n], "Added", n); };
  const removeNode = () => { if (nodes.length > 2) mutate(nodes.slice(0, -1), "Removed", nodes[nodes.length - 1]); };
  const reset = () => { clearT(); setNodes(["A", "B", "C"]); setVnodes(1); setMsg(null); setTrace(null); setMoved([]); };
  const setV = (v: number) => { clearT(); setVnodes(v); setTrace(null); setMoved([]); setMsg(null); };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="mb-3 text-[13px] leading-snug text-slate-400">
        <strong className="text-slate-300">The problem:</strong> with plain <code>hash(key) % N</code>, changing the
        server count N re-hashes almost every key — a cache-wide stampede. Consistent hashing puts keys and servers on a
        ring, so adding/removing a server only moves the keys in one small arc.
      </p>

      <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
        <svg viewBox="0 0 320 320" className="mx-auto h-auto w-full max-w-[340px]" role="img" aria-label="Hash ring" data-tour="ch-ring">
          {/* two guides: outer server ring, inner key ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#334155" strokeWidth={2} />
          <circle cx={CX} cy={CY} r={KR} fill="none" stroke="#1e293b" strokeWidth={1} strokeDasharray="3 4" />

          {/* trace: arc walked along the server ring */}
          {trace ? <path d={arcPath(trace.from, trace.done ? trace.to : trace.angle)} fill="none" stroke={colorFor(trace.owner)} strokeWidth={3.5} strokeLinecap="round" opacity={0.8} /> : null}
          {/* radial connector from the traced key (inner) out to the ring */}
          {trace ? (() => { const a = pointFor(trace.from, keyLayout[trace.key].r), b = pointFor(trace.from, R); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorFor(trace.owner)} strokeWidth={1.5} strokeDasharray="2 2" opacity={0.7} />; })() : null}

          {/* keys — on the inner ring, coloured by owning server (dodged inward on collision) */}
          {KEYS.map((k) => {
            const L = keyLayout[k];
            const p = pointFor(L.a, L.r);
            const isTest = trace?.key === k;
            const isMoved = moved.includes(k);
            return <circle key={k} cx={p.x} cy={p.y} r={isTest || isMoved ? 6.5 : 4.5} fill={colorFor(model.owner[k])} stroke={isTest ? "#fff" : isMoved ? "#fde047" : "#0b1220"} strokeWidth={isTest || isMoved ? 2.5 : 1} />;
          })}

          {/* servers — larger labelled markers on the outer ring */}
          {model.ring.map((rp, i) => {
            const p = pointFor(rp.a, R);
            const on = trace?.done && trace.owner === rp.n && Math.abs(rp.a - trace.to) < 0.5;
            return (
              <g key={`${rp.n}#${i}`}>
                <circle cx={p.x} cy={p.y} r={12} fill={colorFor(rp.n)} stroke={on ? "#fff" : "#0b1220"} strokeWidth={on ? 3 : 2.5} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0b1220">{rp.n}</text>
              </g>
            );
          })}

          {/* travelling trace marker */}
          {trace && !trace.done ? (() => { const p = pointFor(trace.angle, R); return <circle cx={p.x} cy={p.y} r={6} fill="#fff" stroke={colorFor(trace.owner)} strokeWidth={2.5} />; })() : null}

          {/* centre caption */}
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#64748b">hash ring</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={9} fill="#475569">● key · ⬤ server</text>
        </svg>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2" data-tour="ch-test">
            <span className="text-xs uppercase tracking-wide text-slate-500">Test a key</span>
            <select value={testKey} onChange={(e) => { setTestKey(e.target.value); setTrace(null); }} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200">
              {KEYS.map((k) => (<option key={k} value={k}>{k}</option>))}
            </select>
            <button type="button" onClick={runTrace} className="rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-sm font-medium text-fuchsia-300 hover:bg-fuchsia-500/20">▶ Trace</button>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={addNode} data-tour="ch-add" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add server</button>
            <button type="button" onClick={removeNode} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Remove server</button>
            <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
          </div>

          <div className="mb-3 flex items-center gap-2" data-tour="ch-vnodes">
            <span className="text-xs uppercase tracking-wide text-slate-500">Virtual nodes / server</span>
            <div className="inline-flex overflow-hidden rounded-md border border-slate-700">
              {[1, 3, 5].map((v) => (
                <button key={v} type="button" onClick={() => setV(v)} className={`px-2.5 py-1 text-xs font-semibold ${vnodes === v ? "bg-sky-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:text-white"}`}>{v}×</button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {nodes.map((n) => {
              const count = KEYS.filter((k) => model.owner[k] === n).length;
              return (
                <span key={n} className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(n) }} />
                  {n}: {count} keys
                </span>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300" data-tour="ch-msg">
            {trace ? (
              <>
                <span className="font-mono text-slate-200">{trace.key}</span> hashes to {Math.round(trace.from)}° → walks clockwise → owned by{" "}
                <span className="font-semibold" style={{ color: colorFor(trace.owner) }}>server {trace.owner}</span>{trace.done ? " ✓" : "…"}
              </>
            ) : msg ? (
              <>{msg}{moved.length > 0 ? <span className="ml-1 text-yellow-300">(the outlined keys moved)</span> : null}</>
            ) : (
              "Trace a key to see who owns it, or add/remove a server and watch how few keys re-hash. Raise virtual nodes to balance the load."
            )}
          </div>
        </div>
      </div>
      <GuidedTour tourId="consistent-hashing" steps={TOUR} autoStart={false} />
    </div>
  );
}
