import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import { RequestSimEngine, type Blueprint, type ChaosKind, type SimSnapshot } from "./engine";
import { componentDef, type StationConfig } from "./registry";
import { evaluateAutoscale, resetAutoscale } from "./autoscale";
import { supabase, shortId } from "@/lib/supabase";

export interface SimNodeData extends Record<string, unknown> {
  componentType: string;
  label: string;
  config: Partial<StationConfig>;
}

export type SimFlowNode = Node<SimNodeData>;

function graphToBlueprint(nodes: SimFlowNode[], edges: Edge[]): Blueprint {
  return {
    id: "playground",
    title: "Playground",
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.componentType,
      label: n.data.label,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      config: n.data.config,
    })),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  };
}

interface PlaygroundStore {
  engine: RequestSimEngine | null;
  nodes: SimFlowNode[];
  edges: Edge[];
  snapshot: SimSnapshot | null;
  running: boolean;
  autoScale: boolean;
  speed: number; // sim-time multiplier (0.5 = half speed, easier to follow)
  selectedId: string | null;
  seq: number;
  blueprintId: string;

  loadBlueprint: (blueprint: Blueprint) => void;
  rebuild: () => void;
  tick: (dt: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  toggleAutoScale: () => void;
  setSpeed: (n: number) => void;
  reset: () => void;

  onNodesChange: (changes: NodeChange<SimFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  addComponent: (type: string, position: { x: number; y: number }) => void;
  deleteSelected: () => void;
  select: (id: string | null) => void;
  setNodeConfig: (id: string, key: keyof StationConfig, value: number) => void;
  applyChaos: (id: string, kind: ChaosKind) => void;
  spikeTraffic: () => void;
  serialize: () => string;
  loadSerialized: (encoded: string) => boolean;
  /** Save the current design to Supabase; returns a short id, or null if unavailable. */
  saveDesign: () => Promise<string | null>;
  /** Load a shared design from Supabase by short id. */
  loadFromCloud: (id: string) => Promise<boolean>;
}

export const usePlaygroundStore = create<PlaygroundStore>((set, get) => ({
  engine: null,
  nodes: [],
  edges: [],
  snapshot: null,
  running: false,
  autoScale: false,
  speed: 0.5,
  selectedId: null,
  seq: 0,
  blueprintId: "",

  loadBlueprint: (blueprint) => {
    const nodes: SimFlowNode[] = blueprint.nodes.map((n) => ({
      id: n.id,
      type: "sim",
      position: { x: n.x, y: n.y },
      data: { componentType: n.type, label: n.label, config: n.config ?? {} },
    }));
    const edges: Edge[] = blueprint.edges.map((e) => ({
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
    }));
    const engine = new RequestSimEngine(blueprint, { seed: 1 });
    resetAutoscale();
    set({
      engine,
      nodes,
      edges,
      snapshot: engine.getSnapshot(),
      running: false,
      selectedId: null,
      seq: nodes.length,
      blueprintId: blueprint.id,
    });
  },

  rebuild: () => {
    const { nodes, edges, running } = get();
    const engine = new RequestSimEngine(graphToBlueprint(nodes, edges), { seed: 1 });
    if (running) engine.play();
    set({ engine, snapshot: engine.getSnapshot() });
  },

  tick: (dt) => {
    const engine = get().engine;
    if (!engine) return;
    engine.tick(dt * get().speed);
    let snapshot = engine.getSnapshot();

    if (get().autoScale) {
      const replicasOf = (id: string) =>
        (get().nodes.find((n) => n.id === id)?.data.config.replicas as number | undefined) ?? 1;
      const actions = evaluateAutoscale(snapshot, replicasOf);
      if (actions.length > 0) {
        for (const a of actions) engine.setConfig(a.id, "replicas", a.to);
        set({
          nodes: get().nodes.map((n) => {
            const a = actions.find((x) => x.id === n.id);
            return a ? { ...n, data: { ...n.data, config: { ...n.data.config, replicas: a.to } } } : n;
          }),
        });
        snapshot = engine.getSnapshot();
      }
    }

    set({ snapshot });
  },

  play: () => {
    get().engine?.play();
    set({ running: true });
  },
  pause: () => {
    get().engine?.pause();
    set({ running: false });
  },
  toggle: () => (get().running ? get().pause() : get().play()),
  toggleAutoScale: () => set({ autoScale: !get().autoScale }),
  setSpeed: (n) => set({ speed: n }),
  reset: () => {
    set({ running: false });
    resetAutoscale();
    get().rebuild();
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
    if (changes.some((c) => c.type === "remove")) {
      const removed = new Set(changes.filter((c) => c.type === "remove").map((c) => c.id));
      if (get().selectedId && removed.has(get().selectedId as string)) set({ selectedId: null });
      get().rebuild();
    }
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    if (changes.some((c) => c.type === "remove")) get().rebuild();
  },
  onConnect: (conn) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    const exists = get().edges.some((e) => e.source === conn.source && e.target === conn.target);
    if (exists) return;
    set({ edges: addEdge(conn, get().edges) });
    get().rebuild();
  },

  addComponent: (type, position) => {
    const def = componentDef(type);
    if (!def) return;
    const seq = get().seq + 1;
    const id = `${type}-${seq}`;
    const node: SimFlowNode = {
      id,
      type: "sim",
      position,
      data: { componentType: type, label: def.label, config: {} },
    };
    set({ nodes: [...get().nodes, node], seq, selectedId: id });
    get().rebuild();
  },

  deleteSelected: () => {
    const id = get().selectedId;
    if (!id) return;
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedId: null,
    });
    get().rebuild();
  },

  select: (id) => set({ selectedId: id }),

  setNodeConfig: (id, key, value) => {
    const engine = get().engine;
    engine?.setConfig(id, key, value);
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n,
      ),
      snapshot: engine ? engine.getSnapshot() : get().snapshot,
    });
  },

  applyChaos: (id, kind) => {
    const engine = get().engine;
    engine?.applyChaos(id, kind);
    set({ snapshot: engine ? engine.getSnapshot() : get().snapshot });
  },

  spikeTraffic: () => {
    const engine = get().engine;
    if (!engine) return;
    const SPIKE = 3;
    const changed = engine.spikeSources(SPIKE);
    const apply = (rpsFor: (original: number) => number) =>
      get().nodes.map((n) => {
        const c = changed.find((x) => x.id === n.id);
        return c ? { ...n, data: { ...n.data, config: { ...n.data.config, rps: rpsFor(c.original) } } } : n;
      });
    set({ nodes: apply((o) => o * SPIKE), snapshot: engine.getSnapshot() });
    // Revert after a few seconds (skip if the graph was rebuilt meanwhile).
    setTimeout(() => {
      const eng = get().engine;
      if (eng !== engine) return;
      for (const c of changed) eng.setConfig(c.id, "rps", c.original);
      set({ nodes: apply((o) => o), snapshot: eng.getSnapshot() });
    }, 4000);
  },

  serialize: () => {
    const graph = {
      n: get().nodes.map((n) => ({
        i: n.id,
        t: n.data.componentType,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        c: n.data.config,
      })),
      e: get().edges.map((e) => [e.source, e.target]),
    };
    try {
      return btoa(encodeURIComponent(JSON.stringify(graph)));
    } catch {
      return "";
    }
  },

  saveDesign: async () => {
    if (!supabase) return null;
    const id = shortId();
    const { error } = await supabase.from("designs").insert({ id, graph: get().serialize() });
    if (error) {
      console.error("saveDesign failed:", error.message);
      return null;
    }
    return id;
  },

  loadFromCloud: async (id) => {
    if (!supabase) return false;
    const { data, error } = await supabase.from("designs").select("graph").eq("id", id).maybeSingle();
    if (error || !data?.graph) return false;
    return get().loadSerialized(data.graph as string);
  },

  loadSerialized: (encoded) => {
    try {
      const g = JSON.parse(decodeURIComponent(atob(encoded))) as {
        n: { i: string; t: string; x: number; y: number; c?: Record<string, number> }[];
        e: [string, string][];
      };
      const blueprint: Blueprint = {
        id: "shared",
        title: "Shared design",
        nodes: g.n.map((n) => ({
          id: n.i,
          type: n.t,
          label: componentDef(n.t)?.label ?? n.t,
          x: n.x,
          y: n.y,
          config: n.c ?? {},
        })),
        edges: g.e.map(([source, target]) => ({ source, target })),
      };
      get().loadBlueprint(blueprint);
      return true;
    } catch {
      return false;
    }
  },
}));
