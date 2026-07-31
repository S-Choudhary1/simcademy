import { describe, expect, it } from "vitest";
import { RequestSimEngine, type Blueprint, type SimSnapshot } from "./engine";
import { webServiceBlueprint } from "./blueprints";

function run(engine: RequestSimEngine, ms: number): SimSnapshot {
  engine.play();
  for (let t = 0; t < ms; t += 16) engine.tick(16);
  return engine.getSnapshot();
}

function node(snap: SimSnapshot, id: string) {
  const n = snap.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id}`);
  return n;
}

/** Minimal client → service → db chain for controlled assertions. */
function chain(overrides: Partial<Record<string, Record<string, number>>> = {}): Blueprint {
  return {
    id: "chain",
    title: "chain",
    nodes: [
      { id: "client", type: "client", label: "C", x: 0, y: 0, config: { rps: 40, ...overrides.client } },
      { id: "svc", type: "service", label: "S", x: 100, y: 0, config: { servers: 4, meanServiceMs: 20, capacity: 50, ...overrides.svc } },
      { id: "db", type: "database", label: "D", x: 200, y: 0, config: { servers: 8, meanServiceMs: 10, capacity: 40, ...overrides.db } },
    ],
    edges: [
      { source: "client", target: "svc" },
      { source: "svc", target: "db" },
    ],
  };
}

describe("RequestSimEngine", () => {
  it("does not advance until played", () => {
    const engine = new RequestSimEngine(chain(), { seed: 1 });
    engine.tick(1000);
    expect(engine.getSnapshot().time).toBe(0);
    expect(engine.getSnapshot().metrics.throughput).toBe(0);
  });

  it("routes traffic end-to-end and reports throughput + latency percentiles", () => {
    const snap = run(new RequestSimEngine(chain(), { seed: 1 }), 6000);
    expect(snap.metrics.throughput).toBeGreaterThan(0);
    expect(snap.metrics.p50).toBeGreaterThan(0);
    expect(snap.metrics.p99).toBeGreaterThanOrEqual(snap.metrics.p50); // tail ≥ median
  });

  it("keeps up (low latency, no errors) when capacity comfortably exceeds load", () => {
    // 40 rps, service 20ms × 4 servers ≈ 200 req/s capacity, db fast → easily keeps up
    const snap = run(new RequestSimEngine(chain(), { seed: 3 }), 8000);
    expect(snap.metrics.errorRate).toBeLessThan(0.05);
    expect(snap.metrics.p95).toBeLessThan(200);
  });

  it("a slow database becomes the bottleneck and drives latency up", () => {
    const fast = run(new RequestSimEngine(chain({ db: { servers: 8, meanServiceMs: 10, capacity: 40 } }), { seed: 5 }), 6000);
    const slow = run(new RequestSimEngine(chain({ db: { servers: 1, meanServiceMs: 120, capacity: 40 } }), { seed: 5 }), 6000);
    expect(slow.metrics.p95).toBeGreaterThan(fast.metrics.p95);
    expect(slow.bottleneckId).toBe("db");
  });

  it("overload causes queue buildup and dropped requests (errors)", () => {
    // 120 rps into a single slow server with a tiny queue → saturation + drops
    const snap = run(
      new RequestSimEngine(chain({ client: { rps: 120 }, svc: { servers: 1, meanServiceMs: 60, capacity: 5 } }), { seed: 7 }),
      6000,
    );
    expect(snap.metrics.errorRate).toBeGreaterThan(0.1);
    expect(node(snap, "svc").dropped).toBeGreaterThan(0);
  });

  it("a healthy cache shields the database (fewer requests reach it)", () => {
    const bp = (hit: number): Blueprint => ({
      id: "c",
      title: "c",
      nodes: [
        { id: "client", type: "client", label: "C", x: 0, y: 0, config: { rps: 60 } },
        { id: "svc", type: "service", label: "S", x: 100, y: 0, config: { servers: 8, meanServiceMs: 5 } },
        { id: "cache", type: "cache", label: "K", x: 200, y: 0, config: { hitRatio: hit } },
        { id: "db", type: "database", label: "D", x: 300, y: 0, config: { servers: 8, meanServiceMs: 15 } },
      ],
      edges: [
        { source: "client", target: "svc" },
        { source: "svc", target: "cache" },
        { source: "cache", target: "db" },
      ],
    });
    const cold = run(new RequestSimEngine(bp(0.0), { seed: 9 }), 6000);
    const warm = run(new RequestSimEngine(bp(0.9), { seed: 9 }), 6000);
    expect(node(warm, "db").completed).toBeLessThan(node(cold, "db").completed);
  });

  it("killing a node makes its requests error; recover restores service", () => {
    const engine = new RequestSimEngine(chain(), { seed: 2 });
    run(engine, 3000);
    engine.applyChaos("db", "kill");
    expect(engine.getSnapshot().nodes.find((n) => n.id === "db")?.status).toBe("failed");
    const killed = run(engine, 4000);
    expect(killed.metrics.errorRate).toBeGreaterThan(0.2);
    engine.applyChaos("db", "recover");
    expect(engine.getSnapshot().nodes.find((n) => n.id === "db")?.status).toBe("healthy");
  });

  it("is deterministic across identical runs", () => {
    const p99 = () => run(new RequestSimEngine(webServiceBlueprint, { seed: 4 }), 5000).metrics.p99;
    expect(p99()).toBe(p99());
  });

  it("runs the shipped web-service blueprint without errors under normal load", () => {
    const snap = run(new RequestSimEngine(webServiceBlueprint, { seed: 1 }), 6000);
    expect(snap.nodes).toHaveLength(7);
    expect(snap.metrics.throughput).toBeGreaterThan(0);
  });
});
