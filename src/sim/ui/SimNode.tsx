"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { usePlaygroundStore } from "../store";
import { componentDef, type Category } from "../registry";

const CATEGORY_ACCENT: Record<Category, string> = {
  client: "#a78bfa",
  network: "#38bdf8",
  compute: "#34d399",
  cache: "#f472b6",
  data: "#fbbf24",
  messaging: "#f97316",
};

function utilColor(u: number): string {
  return u > 0.85 ? "#f87171" : u > 0.6 ? "#fbbf24" : "#34d399";
}

/** React Flow node card. Structure comes from React Flow; live stats are pulled
 *  from the store per-frame so we never re-push the whole nodes array. */
export function SimNode({ id, selected, data }: NodeProps) {
  const stat = usePlaygroundStore((s) => s.snapshot?.nodes.find((n) => n.id === id));
  const componentType = (data as { componentType: string }).componentType;
  const label = (data as { label: string }).label;
  const def = componentDef(componentType);
  const accent = def ? CATEGORY_ACCENT[def.category] : "#64748b";

  const util = stat ? stat.utilization : 0;
  const queue = stat?.queue ?? 0;
  const backlog = stat?.backlog ?? 0;
  const dropped = stat?.dropped ?? 0;
  const replicas = stat?.replicas ?? 1;
  const failed = stat?.status === "failed";
  const slow = stat?.status === "slow";
  const partitioned = stat?.status === "partitioned";
  const bottleneck = stat?.bottleneck ?? false;

  const border = selected
    ? "#38bdf8"
    : failed
      ? "#f87171"
      : partitioned
        ? "#fb7185"
        : slow
          ? "#fbbf24"
          : bottleneck
            ? "#fb923c"
            : "#1e293b";

  // Show replicas as a stack of pod cards behind the node (up to 3 layers; the
  // badge shows the exact count). Effective capacity = servers × replicas.
  const layers = replicas > 1 ? Math.min(replicas - 1, 3) : 0;

  return (
    <div className="relative w-[180px]">
      {Array.from({ length: layers }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute inset-0 z-0 rounded-xl"
          style={{
            background: "#0f172a",
            border: `1.5px solid ${selected ? "#38bdf8" : "#64748b"}`,
            transform: `translate(${(i + 1) * 7}px, ${(i + 1) * 7}px)`,
            opacity: failed ? 0.4 : 0.95 - i * 0.22,
          }}
        />
      ))}
      <div
        className="relative z-10 w-full rounded-xl bg-slate-900/95 shadow-xl backdrop-blur"
        style={{
          border: `1.5px solid ${border}`,
          boxShadow: bottleneck ? "0 0 0 3px rgba(251,146,60,0.18)" : undefined,
          opacity: failed ? 0.55 : 1,
        }}
      >
        <Handle type="target" position={Position.Left} style={{ background: "#475569", width: 8, height: 8 }} />

      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base"
          style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}
        >
          {def?.icon ?? "▢"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-slate-100">{label}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">{def?.label ?? componentType}</div>
        </div>
        {replicas > 1 ? (
          <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300" title={`${replicas} pods (effective capacity = servers × ${replicas})`}>
            {replicas} pods
          </span>
        ) : null}
      </div>

      <div className="px-3 pb-2.5 pt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${Math.round(util * 100)}%`, background: utilColor(util) }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-slate-400">
          <span>{def?.behavior === "queue" ? "backlog" : `${Math.round(util * 100)}% busy`}</span>
          <span className="flex items-center gap-1">
            {backlog > 0 ? <span className="rounded bg-orange-500/20 px-1 text-orange-300">lag {backlog}</span> : null}
            {queue > 0 ? <span className="rounded bg-amber-500/20 px-1 text-amber-300">q{queue}</span> : null}
            {dropped > 0 ? <span className="rounded bg-red-500/20 px-1 text-red-300">drop {dropped}</span> : null}
            {failed ? <span className="font-semibold text-red-400">DOWN</span> : null}
            {partitioned ? <span className="font-semibold text-rose-300">◫ loss</span> : null}
          </span>
        </div>
      </div>

        <Handle type="source" position={Position.Right} style={{ background: "#475569", width: 8, height: 8 }} />
      </div>
    </div>
  );
}
