"use client";

import { Playground } from "./Playground";
import type { Blueprint } from "../engine";

/** Embeds the simulator for a single fixed blueprint (no palette / no picker). */
export function EmbeddedSim({ blueprint }: { blueprint: Blueprint }) {
  return (
    <div className="not-prose h-[520px]">
      <Playground blueprint={blueprint} showPalette={false} />
    </div>
  );
}
