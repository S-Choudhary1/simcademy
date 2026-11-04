"use client";

import { usePlaygroundStore } from "../store";
import { componentDef, type StationConfig } from "../registry";

/** Right panel. Shows the selected node's config, live stats, and chaos actions. */
export function Inspector() {
  const selectedId = usePlaygroundStore((s) => s.selectedId);
  const node = usePlaygroundStore((s) => s.nodes.find((n) => n.id === selectedId));
  const stat = usePlaygroundStore((s) => s.snapshot?.nodes.find((n) => n.id === selectedId));
  const setNodeConfig = usePlaygroundStore((s) => s.setNodeConfig);
  const applyChaos = usePlaygroundStore((s) => s.applyChaos);
  const deleteSelected = usePlaygroundStore((s) => s.deleteSelected);
  const select = usePlaygroundStore((s) => s.select);

  if (!selectedId || !node) {
    // Nothing selected: on mobile, take up no space at all so the canvas gets the full
    // screen; on desktop, keep the persistent "nothing selected yet" sidebar.
    return (
      <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-800 bg-slate-950/60 p-4 md:flex" data-tour="tour-inspector">
        <h2 className="text-sm font-semibold text-slate-200">Inspector</h2>
        <p className="mt-6 text-center text-xs text-slate-500">
          Select a component to edit its properties, view live stats, and inject failures.
        </p>
      </aside>
    );
  }

  const def = componentDef(node.data.componentType);
  const cfg = { ...(def?.defaults ?? ({} as StationConfig)), ...node.data.config };

  return (
    <>
      {/* Mobile-only backdrop so the sheet reads as an overlay, and tapping outside closes it. */}
      <div className="fixed inset-0 z-20 bg-slate-950/60 md:hidden" onClick={() => select(null)} />
      <aside
        className="fixed inset-x-0 bottom-0 z-30 flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl md:static md:z-auto md:max-h-none md:w-72 md:shrink-0 md:rounded-none md:border-0 md:border-l md:bg-slate-950/60 md:shadow-none"
        data-tour="tour-inspector"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{def?.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-100">{node.data.label}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{def?.label}</div>
          </div>
          <button
            type="button"
            onClick={() => select(null)}
            aria-label="Close inspector"
            className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 md:hidden"
          >
            ✕
          </button>
        </div>

      {def?.description ? <p className="text-[12px] leading-snug text-slate-400">{def.description}</p> : null}

      {/* live stats */}
      {stat ? (
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Utilisation" value={`${Math.round(stat.utilization * 100)}%`} />
          {def?.behavior === "queue" ? (
            <StatBox label="Backlog (lag)" value={stat.backlog.toLocaleString()} tone={stat.backlog > 300 ? "bad" : "ok"} />
          ) : (
            <StatBox label="In queue" value={`${stat.queue}`} />
          )}
          <StatBox label="Served" value={stat.completed.toLocaleString()} />
          <StatBox label="Dropped" value={stat.dropped.toLocaleString()} tone={stat.dropped > 0 ? "bad" : "ok"} />
        </div>
      ) : null}

      {/* config */}
      {def && def.config.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Properties</h3>
          {def.config.map((field) => {
            const raw = cfg[field.key];
            const display = field.percent ? `${Math.round(raw * 100)}%` : `${raw}${field.unit ? ` ${field.unit}` : ""}`;
            return (
              <label key={field.key} className="block">
                <div className="flex items-center justify-between text-[12px] text-slate-300">
                  <span>{field.label}</span>
                  <span className="tabular-nums text-slate-400">{display}</span>
                </div>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={raw}
                  onChange={(e) => setNodeConfig(node.id, field.key, Number(e.target.value))}
                  className="mt-1 w-full accent-sky-500"
                />
              </label>
            );
          })}
        </div>
      ) : null}

      {/* chaos */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Chaos</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => applyChaos(node.id, "kill")}
            className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
          >
            Kill
          </button>
          <button
            type="button"
            onClick={() => applyChaos(node.id, "slow")}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
          >
            Slow +120ms
          </button>
          <button
            type="button"
            onClick={() => applyChaos(node.id, "partition")}
            className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
          >
            Partition
          </button>
          <button
            type="button"
            onClick={() => applyChaos(node.id, "flaky")}
            className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1.5 text-xs font-medium text-yellow-300 hover:bg-yellow-500/20"
          >
            Flaky ~25%
          </button>
          <button
            type="button"
            onClick={() => applyChaos(node.id, "recover")}
            className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
          >
            Recover
          </button>
        </div>
      </div>

        <button
          type="button"
          onClick={deleteSelected}
          className="mt-auto rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-red-500/50 hover:text-red-300"
        >
          Delete component
        </button>
      </aside>
    </>
  );
}

function StatBox({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${tone === "bad" ? "text-red-300" : "text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}
