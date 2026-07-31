import type { SimSnapshot } from "./engine";
import { componentDef } from "./registry";

/* ================================================================== *
 * A tiny horizontal pod autoscaler for the playground. Every ~0.8s it
 * looks at each scalable node's utilisation and adds a pod when it's
 * saturated, or removes one when it's idle — with hysteresis (wide gap
 * between scale-up and scale-down) and a per-node cooldown so it doesn't
 * flap. Mirrors how a real HPA reacts to CPU/utilisation targets.
 * ================================================================== */

const SCALE_UP_AT = 0.85; // utilisation above this → add a pod
const SCALE_DOWN_AT = 0.3; // below this → remove a pod
const MIN_PODS = 1;
const MAX_PODS = 8;
const EVAL_MS = 800; // re-evaluate at most this often (sim time)
const COOLDOWN_MS = 2000; // wait this long after scaling a node before touching it again

export interface ScaleAction {
  id: string;
  label: string;
  from: number;
  to: number;
}

// Controller memory (single playground instance). Keyed on sim time from the
// snapshot, so it's deterministic and resets cleanly with the engine.
const mem = { lastEval: Number.NEGATIVE_INFINITY, cooldown: new Map<string, number>() };

export function resetAutoscale(): void {
  mem.lastEval = Number.NEGATIVE_INFINITY;
  mem.cooldown.clear();
}

/** Does this component type expose a replicas/pods control? */
function scalable(type: string): boolean {
  return !!componentDef(type)?.config?.some((f) => f.key === "replicas");
}

export function evaluateAutoscale(s: SimSnapshot, replicasOf: (id: string) => number): ScaleAction[] {
  const now = s.time;
  if (now - mem.lastEval < EVAL_MS) return [];
  mem.lastEval = now;

  const actions: ScaleAction[] = [];
  for (const n of s.nodes) {
    if (n.status !== "healthy") continue; // never scale a failed/slow/partitioned node
    if (!scalable(n.type)) continue;
    if (now < (mem.cooldown.get(n.id) ?? Number.NEGATIVE_INFINITY)) continue;

    const pods = replicasOf(n.id);
    let next = pods;
    if (n.utilization > SCALE_UP_AT && pods < MAX_PODS) next = pods + 1;
    else if (n.utilization < SCALE_DOWN_AT && pods > MIN_PODS) next = pods - 1;

    if (next !== pods) {
      actions.push({ id: n.id, label: n.label, from: pods, to: next });
      mem.cooldown.set(n.id, now + COOLDOWN_MS);
    }
  }
  return actions;
}
