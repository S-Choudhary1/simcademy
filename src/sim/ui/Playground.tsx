"use client";

import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, type DragEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import { usePlaygroundStore } from "../store";
import { webServiceBlueprint } from "../blueprints";
import { SimNode } from "./SimNode";
import { Palette } from "./Palette";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";
import { LiveNarration } from "./LiveNarration";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";
import type { Blueprint } from "../engine";

const nodeTypes = { sim: SimNode };

const PLAYGROUND_TOUR: TourStep[] = [
  { title: "Welcome to the request simulator", body: "Build a system from components, run real traffic through it, and watch how latency, throughput, and errors behave. Here's a 60-second tour — use ← → or the buttons." },
  { target: "[data-tour='tour-picker']", title: "Start from a blueprint", body: "Load a ready-made design — a Redis cache, a Kafka pipeline, a full architecture like a URL shortener — or pick the Sandbox and build from scratch." },
  { target: "[data-tour='tour-transport']", title: "Run the simulation", body: "Play/Pause starts and stops traffic. Reset clears the metrics and restarts the clock." },
  { target: "[data-tour='tour-traffic']", title: "Dial the load", body: "Set the incoming request rate (RPS). Push it higher than the system can handle and watch queues and latency climb." },
  { target: "[data-tour='tour-spike']", title: "Inject a traffic spike", body: "Fire a sudden 3× burst for a few seconds — a great way to see how a design copes with a flash crowd." },
  { target: "[data-tour='tour-autoscale']", title: "Auto-scale", body: "Turn this on and saturated nodes add pods automatically (and idle ones give them back) — watch the stacks grow and shrink as you change the load, just like a real autoscaler." },
  { target: "[data-tour='tour-palette']", title: "Build with components", body: "Drag services, caches, queues, load balancers, and databases onto the canvas, then connect them to design your own system." },
  { target: "[data-tour='tour-canvas']", title: "Your system, live", body: "Each node shows real-time utilization. Orange = the current bottleneck, red = failing. Drag between node handles to wire requests from one to the next." },
  { target: "[data-tour='tour-inspector']", title: "Tune & break things", body: "Click any node to open the Inspector: change servers, replicas, and latency, watch its live stats, and inject failures — kill it, slow it, or partition it — to test resilience." },
  { target: "[data-tour='tour-metrics']", title: "Read the SLIs", body: "Throughput (RPS), p50/p95/p99 latency, and error rate — the same signals you'd watch in production. The flag shows which node is the bottleneck." },
  { target: "[data-tour='tour-explain']", title: "What's happening", body: "This panel narrates the running system in plain English — why a node is the bottleneck, why latency spiked — and on failures, the cause and how to fix it. Watch it while you break things." },
  { target: "[data-tour='tour-share']", title: "Share your design", body: "Copy a link that encodes your whole design so others can open it. You can replay this tour anytime from the 🎓 button." },
];

export function Playground({
  blueprint = webServiceBlueprint,
  showPalette = true,
}: {
  blueprint?: Blueprint;
  showPalette?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <PlaygroundInner blueprint={blueprint} showPalette={showPalette} />
    </ReactFlowProvider>
  );
}

function PlaygroundInner({ blueprint, showPalette }: { blueprint: Blueprint; showPalette: boolean }) {
  const nodes = usePlaygroundStore((s) => s.nodes);
  const edges = usePlaygroundStore((s) => s.edges);
  const running = usePlaygroundStore((s) => s.running);
  const loadBlueprint = usePlaygroundStore((s) => s.loadBlueprint);
  const loadSerialized = usePlaygroundStore((s) => s.loadSerialized);
  const loadFromCloud = usePlaygroundStore((s) => s.loadFromCloud);
  const tick = usePlaygroundStore((s) => s.tick);
  const onNodesChange = usePlaygroundStore((s) => s.onNodesChange);
  const onEdgesChange = usePlaygroundStore((s) => s.onEdgesChange);
  const onConnect = usePlaygroundStore((s) => s.onConnect);
  const addComponent = usePlaygroundStore((s) => s.addComponent);
  const select = usePlaygroundStore((s) => s.select);

  const { screenToFlowPosition } = useReactFlow();

  // Load whenever the requested blueprint changes (mount, or a tech-page level
  // toggle). Reading blueprintId via getState avoids re-running when the picker
  // switches blueprints without changing this prop.
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const cloudId = params?.get("d");
    const shared = params?.get("s");
    const state = usePlaygroundStore.getState();
    if (cloudId) {
      if (state.blueprintId !== "shared") loadFromCloud(cloudId); // async; sets state when it resolves
      return;
    }
    if (shared) {
      if (state.blueprintId !== "shared") loadSerialized(shared);
      return;
    }
    if (state.blueprintId !== blueprint.id) loadBlueprint(blueprint);
  }, [blueprint, loadBlueprint, loadSerialized, loadFromCloud]);

  // Animation loop — drives the store, not React state directly.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    const loop = (ts: number) => {
      if (last === null) last = ts;
      const dt = ts - last;
      last = ts;
      tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, tick]);

  const displayEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        animated: running,
        style: { stroke: running ? "#38bdf8" : "#334155", strokeWidth: 1.5 },
      })),
    [edges, running],
  );

  const onNodeClick: NodeMouseHandler = (_e, node) => select(node.id);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/simcademy-component");
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addComponent(type, position);
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <StatusBar showPicker={showPalette} />
      <div className="flex min-h-0 flex-1">
        {showPalette ? <Palette /> : null}
        <div className="relative min-w-0 flex-1" onDrop={onDrop} onDragOver={onDragOver} data-tour="tour-canvas">
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => select(null)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={1.75}
            defaultEdgeOptions={{ style: { strokeWidth: 1.5 } }}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background color="#1e293b" gap={22} size={1} />
            <Controls showInteractive={false} className="!bg-slate-900 !text-slate-200" />
            <MiniMap
              pannable
              zoomable
              nodeColor="#334155"
              maskColor="rgba(2,6,23,0.6)"
              className="!bg-slate-900"
            />
          </ReactFlow>
        </div>
        <Inspector />
      </div>
      {showPalette ? <LiveNarration /> : null}
      {showPalette ? <GuidedTour tourId="playground" steps={PLAYGROUND_TOUR} /> : null}
    </div>
  );
}
