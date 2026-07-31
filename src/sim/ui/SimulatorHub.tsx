"use client";

import { useState } from "react";
import Link from "next/link";
import { Playground } from "./Playground";
import { CONCEPT_SIMS, CONCEPT_SIM_CATEGORIES } from "@/concepts/registry";

const ARCHITECTURE = "architecture";

/**
 * The Playground hub. Defaults to the Architecture Builder (the request-routing
 * simulator); a selector also mounts any concept's own correct visualization —
 * the same bespoke component from its concept page, never the request engine.
 */
export function SimulatorHub() {
  const [selected, setSelected] = useState<string>(ARCHITECTURE);
  const concept = CONCEPT_SIMS.find((c) => c.slug === selected);
  const isArch = selected === ARCHITECTURE;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-500">Simulator</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
            aria-label="Choose a simulator"
          >
            <option value={ARCHITECTURE}>🏗️ Architecture Builder</option>
            {CONCEPT_SIM_CATEGORIES.map((cat) => (
              <optgroup key={cat} label={cat}>
                {CONCEPT_SIMS.filter((c) => c.category === cat).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {concept ? (
          <Link
            href={`/concepts/${concept.slug}`}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            Open the full {concept.name} lesson →
          </Link>
        ) : (
          <span className="hidden text-xs text-slate-500 sm:inline">
            Drag components in, connect them, press Play, click a node to break it.
          </span>
        )}
      </div>

      <div className={`min-h-0 flex-1 ${isArch ? "" : "overflow-auto"}`}>
        {isArch ? (
          <Playground />
        ) : concept ? (
          <div className="mx-auto max-w-3xl py-1">
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{concept.name}</h2>
            <concept.Component />
          </div>
        ) : null}
      </div>
    </div>
  );
}
