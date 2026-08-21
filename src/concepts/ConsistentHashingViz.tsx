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

const CX = 160, CY = 160, R = 118;
const KEYS = Array.from({ length: 16 }, (_, i) => `key-${i}`);
const COLORS = ["#38bdf8", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb923c", "#22d3ee"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const angleOf = (s: string) => hash(s) % 360;
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
        <svg viewBox="0 0 320 320" className="mx-auto h-auto w-full max-w-[320px]" role="img" aria-label="Hash ring" data-tour="ch-ring">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth={2} />
          {trace ? <path d={arcPath(trace.from, trace.done ? trace.to : trace.angle)} fill="none" stroke={colorFor(trace.owner)} strokeWidth={3} strokeLinecap="round" opacity={0.75} /> : null}

          {KEYS.map((k) => {
            const p = pointFor(angleOf(k));
            const isTest = trace?.key === k;
            const isMoved = moved.includes(k);
            return <circle key={k} cx={p.x} cy={p.y} r={isTest || isMoved ? 6 : 4} fill={colorFor(model.owner[k])} stroke={isTest ? "#fff" : isMoved ? "#fde047" : "none"} strokeWidth={isTest || isMoved ? 2 : 0} opacity={0.95} />;
          })}

          {model.ring.map((rp, i) => {
            const p = pointFor(rp.a);
            return (
              <g key={`${rp.n}#${i}`}>
                <circle cx={p.x} cy={p.y} r={9} fill={colorFor(rp.n)} stroke="#0f172a" strokeWidth={2} />
                <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0b1220">{rp.n}</text>
              </g>
            );
          })}

          {trace && trace.done ? (() => { const p = pointFor(trace.to); return <circle cx={p.x} cy={p.y} r={14} fill="none" stroke={colorFor(trace.owner)} strokeWidth={2} opacity={0.6} />; })() : null}
          {trace && !trace.done ? (() => { const p = pointFor(trace.angle); return <circle cx={p.x} cy={p.y} r={5} fill="#fff" stroke={colorFor(trace.owner)} strokeWidth={2} />; })() : null}
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
