"use client";

import { useState } from "react";
import { usePlaygroundStore } from "../store";
import { componentDef } from "../registry";
import { BLUEPRINT_CATALOG } from "../blueprints";

/** Top bar: transport + traffic controls on the left, live SLI metrics on the right. */
export function StatusBar({ showPicker = true }: { showPicker?: boolean }) {
  const running = usePlaygroundStore((s) => s.running);
  const toggle = usePlaygroundStore((s) => s.toggle);
  const autoScale = usePlaygroundStore((s) => s.autoScale);
  const toggleAutoScale = usePlaygroundStore((s) => s.toggleAutoScale);
  const speed = usePlaygroundStore((s) => s.speed);
  const setSpeed = usePlaygroundStore((s) => s.setSpeed);
  const reset = usePlaygroundStore((s) => s.reset);
  const metrics = usePlaygroundStore((s) => s.snapshot?.metrics);
  const bottleneckId = usePlaygroundStore((s) => s.snapshot?.bottleneckId ?? null);
  const bottleneckLabel = usePlaygroundStore((s) =>
    s.nodes.find((n) => n.id === s.snapshot?.bottleneckId)?.data.label ?? null,
  );
  const setNodeConfig = usePlaygroundStore((s) => s.setNodeConfig);
  const loadBlueprint = usePlaygroundStore((s) => s.loadBlueprint);
  const spikeTraffic = usePlaygroundStore((s) => s.spikeTraffic);
  const serialize = usePlaygroundStore((s) => s.serialize);
  const blueprintId = usePlaygroundStore((s) => s.blueprintId);
  const [copied, setCopied] = useState(false);
  const maxBacklog = usePlaygroundStore((s) =>
    s.snapshot ? s.snapshot.nodes.reduce((m, n) => Math.max(m, n.backlog), 0) : 0,
  );
  const source = usePlaygroundStore((s) => s.nodes.find((n) => componentDef(n.data.componentType)?.behavior === "source"));

  const rps = source ? ((source.data.config.rps as number | undefined) ?? componentDef(source.data.componentType)?.defaults.rps ?? 60) : 60;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 backdrop-blur">
      {showPicker ? (
        <select
          value={blueprintId}
          onChange={(e) => {
            const bp = BLUEPRINT_CATALOG.flatMap((g) => g.items).find((i) => i.id === e.target.value)?.blueprint;
            if (bp) loadBlueprint(bp);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
          aria-label="Load blueprint"
          data-tour="tour-picker"
        >
          {BLUEPRINT_CATALOG.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((it) => (
                <option key={it.id} value={it.id}>
                  {g.group === "Sandbox" ? it.title : `${g.group} · ${it.title}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : null}

      <div className="flex items-center gap-2" data-tour="tour-transport">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          ↻ Reset
        </button>
        <button
          type="button"
          onClick={spikeTraffic}
          title="Temporarily triple the request rate"
          data-tour="tour-spike"
          className="rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-sm font-medium text-fuchsia-300 hover:bg-fuchsia-500/20"
        >
          ⚡ Spike
        </button>
        <button
          type="button"
          onClick={toggleAutoScale}
          title="Auto-scale: add pods when a node saturates, remove them when idle"
          data-tour="tour-autoscale"
          aria-pressed={autoScale}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
            autoScale
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-700"
          }`}
        >
          ⚖ Auto-scale{autoScale ? " · on" : ""}
        </button>
        <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900" data-tour="tour-speed" title="Slow the simulation down so you can follow what's happening">
          <span className="px-2 text-[11px] uppercase tracking-wide text-slate-500">Speed</span>
          {([[0.5, "½×"], [1, "1×"], [2, "2×"]] as [number, string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setSpeed(v)}
              className={`px-2 py-1.5 text-xs font-semibold ${speed === v ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {showPicker ? (
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/playground?s=${serialize()}`;
              navigator.clipboard?.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            title="Copy a shareable link to this design"
            data-tour="tour-share"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            {copied ? "Copied ✓" : "🔗 Share"}
          </button>
        ) : null}
      </div>

      {source ? (
        <label className="flex items-center gap-2 text-sm" data-tour="tour-traffic">
          <span className="text-slate-400">Traffic</span>
          <input
            type="range"
            min={1}
            max={400}
            step={1}
            value={rps}
            onChange={(e) => setNodeConfig(source.id, "rps", Number(e.target.value))}
            className="w-36 accent-sky-500"
          />
          <span className="w-16 tabular-nums text-slate-300">{rps} rps</span>
        </label>
      ) : null}

      <div className="ml-auto flex items-center gap-x-4 gap-y-1" data-tour="tour-metrics">
        <Metric label="RPS" value={metrics ? `${metrics.throughput}` : "0"} />
        <Metric label="p50" value={metrics ? `${metrics.p50}ms` : "—"} />
        <Metric label="p95" value={metrics ? `${metrics.p95}ms` : "—"} />
        <Metric label="p99" value={metrics ? `${metrics.p99}ms` : "—"} tone={metrics && metrics.p99 > 300 ? "warn" : "ok"} />
        <Metric
          label="Errors"
          value={metrics ? `${(metrics.errorRate * 100).toFixed(1)}%` : "0%"}
          tone={metrics && metrics.errorRate > 0.05 ? "bad" : "ok"}
        />
        {maxBacklog > 0 ? (
          <Metric label="Lag" value={maxBacklog.toLocaleString()} tone={maxBacklog > 300 ? "warn" : "ok"} />
        ) : null}
        <div className="hidden items-center gap-1.5 border-l border-slate-800 pl-4 text-sm sm:flex">
          <span className="text-slate-500">⚑</span>
          <span className="font-medium text-orange-300">{bottleneckId ? bottleneckLabel : "no bottleneck"}</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-slate-100";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
