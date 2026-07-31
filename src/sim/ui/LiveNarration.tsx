"use client";

import { useState } from "react";
import { usePlaygroundStore } from "../store";
import { analyze, type Severity } from "../insights";

const SEV: Record<Severity, { dot: string; text: string; border: string; bg: string }> = {
  critical: { dot: "bg-red-500", text: "text-red-300", border: "border-red-500/40", bg: "bg-red-500/10" },
  warn: { dot: "bg-amber-500", text: "text-amber-300", border: "border-amber-500/40", bg: "bg-amber-500/10" },
  info: { dot: "bg-emerald-500", text: "text-emerald-300", border: "border-emerald-500/40", bg: "bg-emerald-500/10" },
};

/**
 * Live "what's happening" narration. Reads the engine snapshot every tick and
 * explains the system's behaviour — and, on trouble, the cause and the fix.
 * Collapsible so it never gets in the way.
 */
export function LiveNarration() {
  const snapshot = usePlaygroundStore((s) => s.snapshot);
  const running = usePlaygroundStore((s) => s.running);
  const [open, setOpen] = useState(true);

  const insights = snapshot ? analyze(snapshot) : [];
  const top = insights[0];
  const critical = insights.filter((i) => i.severity === "critical").length;
  const warn = insights.filter((i) => i.severity === "warn").length;

  return (
    <div data-tour="tour-explain" className="shrink-0 border-t border-slate-800 bg-slate-950/80">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-2 text-left">
        <span className="text-sm">💡</span>
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">What&rsquo;s happening</span>
        {top ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${SEV[top.severity].dot}`} />
            <span className="truncate text-slate-300">{top.icon} {top.title}</span>
          </span>
        ) : (
          <span className="truncate text-xs text-slate-500">{running ? "warming up…" : "press Play to run and see live explanations"}</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-slate-500">
          {critical > 0 ? <span className="rounded bg-red-500/20 px-1.5 text-red-300">{critical} critical</span> : null}
          {warn > 0 ? <span className="rounded bg-amber-500/20 px-1.5 text-amber-300">{warn} warning</span> : null}
          <span className="text-slate-600">{open ? "▾" : "▸"}</span>
        </span>
      </button>

      {open ? (
        <div className="max-h-44 overflow-y-auto px-3 pb-3">
          {insights.length === 0 ? (
            <p className="px-1 text-xs text-slate-500">
              {running
                ? "Everything's keeping up. Raise the traffic, add a component, or select a node and inject a failure to see explanations appear here."
                : "The simulation is paused — press Play."}
            </p>
          ) : (
            <div className="grid gap-1.5 md:grid-cols-2">
              {insights.slice(0, 6).map((i) => (
                <div key={i.key} className={`rounded-lg border px-2.5 py-1.5 ${SEV[i.severity].border} ${SEV[i.severity].bg}`}>
                  <div className={`text-xs font-semibold ${SEV[i.severity].text}`}>{i.icon} {i.title}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-400">
                    <span className="text-slate-500">Why:</span> {i.reason}
                  </div>
                  {i.fix ? (
                    <div className="mt-0.5 text-[11px] leading-snug text-sky-300">
                      <span className="text-sky-400/70">Fix:</span> {i.fix}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
