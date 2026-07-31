"use client";

import { useEffect, useMemo, useState } from "react";
import { RequestSimEngine, type Blueprint, type NodeSnapshot, type SimSnapshot } from "../engine";
import { componentDef } from "../registry";

const NODE_W = 120;
const NODE_H = 46;

interface Side {
  title: string;
  blueprint: Blueprint;
}

function sourceId(bp: Blueprint): string | undefined {
  return bp.nodes.find((n) => componentDef(n.type)?.behavior === "source")?.id;
}

/**
 * Runs two independent simulations in lockstep from one set of controls so the
 * comparison is apples-to-apples (same traffic, same clock). Each engine is its
 * own instance — no shared store — so the two panels never interfere.
 */
export function ComparisonSim({ left, right }: { left: Side; right: Side }) {
  const [leftEngine] = useState(() => new RequestSimEngine(left.blueprint, { seed: 1 }));
  const [rightEngine] = useState(() => new RequestSimEngine(right.blueprint, { seed: 1 }));
  const [running, setRunning] = useState(false);
  const [rps, setRps] = useState(60);
  const [ls, setLs] = useState<SimSnapshot>(() => leftEngine.getSnapshot());
  const [rs, setRs] = useState<SimSnapshot>(() => rightEngine.getSnapshot());

  const lSrc = useMemo(() => sourceId(left.blueprint), [left.blueprint]);
  const rSrc = useMemo(() => sourceId(right.blueprint), [right.blueprint]);

  useEffect(() => {
    if (lSrc) leftEngine.setConfig(lSrc, "rps", rps);
    if (rSrc) rightEngine.setConfig(rSrc, "rps", rps);
  }, [rps, leftEngine, rightEngine, lSrc, rSrc]);

  useEffect(() => {
    if (!running) return;
    leftEngine.play();
    rightEngine.play();
    let raf = 0;
    let last: number | null = null;
    const loop = (ts: number) => {
      if (last === null) last = ts;
      const dt = ts - last;
      last = ts;
      leftEngine.tick(dt);
      rightEngine.tick(dt);
      setLs(leftEngine.getSnapshot());
      setRs(rightEngine.getSnapshot());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      leftEngine.pause();
      rightEngine.pause();
    };
  }, [running, leftEngine, rightEngine]);

  const reset = () => {
    setRunning(false);
    leftEngine.reset();
    rightEngine.reset();
    if (lSrc) leftEngine.setConfig(lSrc, "rps", rps);
    if (rSrc) rightEngine.setConfig(rSrc, "rps", rps);
    setLs(leftEngine.getSnapshot());
    setRs(rightEngine.getSnapshot());
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="rounded-md bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          {running ? "❚❚ Pause" : "▶ Play both"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          ↻ Reset
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-400">Traffic (both)</span>
          <input
            type="range"
            min={1}
            max={140}
            step={1}
            value={rps}
            onChange={(e) => setRps(Number(e.target.value))}
            className="w-40 accent-sky-500"
          />
          <span className="w-16 tabular-nums text-slate-400">{rps} rps</span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel title={left.title} snap={ls} />
        <Panel title={right.title} snap={rs} />
      </div>
    </div>
  );
}

function Panel({ title, snap }: { title: string; snap: SimSnapshot }) {
  const lag = snap.nodes.reduce((m, n) => Math.max(m, n.backlog), 0);
  const m = snap.metrics;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <h4 className="mb-2 text-sm font-semibold text-slate-100">{title}</h4>
      <MiniCanvas snapshot={snap} />
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        <Stat label="RPS" value={`${m.throughput}`} />
        <Stat label="p99" value={`${m.p99}ms`} />
        <Stat label="Err" value={`${(m.errorRate * 100).toFixed(0)}%`} tone={m.errorRate > 0.05 ? "bad" : "ok"} />
        <Stat label="Lag" value={`${lag}`} tone={lag > 200 ? "warn" : "ok"} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-slate-100";
  return (
    <div className="rounded bg-slate-950/60 px-1 py-1">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function utilColor(u: number): string {
  return u > 0.85 ? "#f87171" : u > 0.6 ? "#fbbf24" : "#34d399";
}

function MiniCanvas({ snapshot }: { snapshot: SimSnapshot }) {
  const nodes = snapshot.nodes;
  if (nodes.length === 0) return <div className="h-40" />;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - NODE_W;
  const maxX = Math.max(...xs) + NODE_W;
  const minY = Math.min(...ys) - NODE_H;
  const maxY = Math.max(...ys) + NODE_H;

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className="h-40 w-full rounded-lg bg-slate-950 ring-1 ring-slate-800"
      role="img"
      aria-label="Comparison diagram"
    >
      {snapshot.edges.map((e) => {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) return null;
        return (
          <line
            key={e.id}
            x1={s.x}
            y1={s.y}
            x2={t.x}
            y2={t.y}
            stroke={e.active ? "#38bdf8" : "#334155"}
            strokeWidth={2}
          />
        );
      })}
      {nodes.map((n) => (
        <MiniNode key={n.id} node={n} />
      ))}
    </svg>
  );
}

function MiniNode({ node }: { node: NodeSnapshot }) {
  const def = componentDef(node.type);
  const x = node.x - NODE_W / 2;
  const y = node.y - NODE_H / 2;
  const stroke =
    node.status === "failed"
      ? "#f87171"
      : node.bottleneck
        ? "#fb923c"
        : "#334155";
  return (
    <g>
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8} fill="#0f172a" stroke={stroke} strokeWidth={1.5} />
      <text x={node.x} y={node.y - 4} textAnchor="middle" fill="#e2e8f0" fontSize={12} fontWeight={600}>
        {def?.icon ?? "▢"} {node.label}
      </text>
      <rect x={x + 10} y={node.y + 6} width={NODE_W - 20} height={4} rx={2} fill="#1e293b" />
      <rect
        x={x + 10}
        y={node.y + 6}
        width={(NODE_W - 20) * Math.min(1, node.utilization)}
        height={4}
        rx={2}
        fill={utilColor(node.utilization)}
      />
      {node.backlog > 0 ? (
        <text x={node.x} y={node.y + 20} textAnchor="middle" fill="#fdba74" fontSize={10}>
          lag {node.backlog}
        </text>
      ) : null}
    </g>
  );
}
