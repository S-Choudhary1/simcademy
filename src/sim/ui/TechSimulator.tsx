"use client";

import { useState } from "react";
import { Playground } from "./Playground";
import { TECH_BLUEPRINTS, type Level, type Tech } from "../blueprints";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Embeds the simulator on a technology page with a Beginner/Intermediate/Advanced
 * toggle. Switching level swaps the whole blueprint (and its summary) — the
 * simulation gets deeper, not just the prose.
 */
export function TechSimulator({ tech }: { tech: Tech }) {
  const [level, setLevel] = useState<Level>("beginner");
  const meta = TECH_BLUEPRINTS[tech][level];

  return (
    <div className="not-prose">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                level === l ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-slate-200">{meta.title}</span>
      </div>

      <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <p className="text-sm leading-relaxed text-slate-300">{meta.summary}</p>
        {meta.concepts && meta.concepts.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Concepts:</span>
            {meta.concepts.map((c) => (
              <span key={c} className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {c}
              </span>
            ))}
          </div>
        ) : null}
        {meta.tryThis ? (
          <p className="mt-2 text-xs text-sky-300">
            <span className="font-semibold">Try this →</span> {meta.tryThis}
          </p>
        ) : null}
      </div>

      <div className="h-[540px]">
        <Playground blueprint={meta.blueprint} showPalette={false} />
      </div>
    </div>
  );
}
