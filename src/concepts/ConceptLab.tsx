"use client";

import { useState } from "react";
import Link from "next/link";
import { CONCEPT_SIMS, CONCEPT_SIM_CATEGORIES } from "./registry";

/**
 * Concept playground — pick any concept's correct visualization and run it
 * right here, then jump to the full lesson. These are the same bespoke
 * components from each concept page (never the request engine).
 */
export function ConceptLab() {
  const [selected, setSelected] = useState<string>(CONCEPT_SIMS[0].slug);
  const concept = CONCEPT_SIMS.find((c) => c.slug === selected) ?? CONCEPT_SIMS[0];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-500">Concept simulator</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 focus:border-fuchsia-500 focus:outline-none"
            aria-label="Choose a concept simulator"
          >
            {CONCEPT_SIM_CATEGORIES.map((cat) => (
              <optgroup key={cat} label={cat}>
                {CONCEPT_SIMS.filter((c) => c.category === cat).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Link href={`/concepts/${concept.slug}`} className="text-sm text-fuchsia-400 hover:text-fuchsia-300">
          Open the full {concept.name} lesson →
        </Link>
      </div>
      <concept.Component />
    </div>
  );
}
