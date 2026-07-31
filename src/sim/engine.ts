import { RNG } from "./rng";
import { componentDef, type StationConfig } from "./registry";
import { LatencyWindow, type GlobalMetrics } from "./metrics";

/**
 * Component-based request-routing simulator.
 *
 * An open queueing network with SYNCHRONOUS call semantics: when a node calls a
 * downstream, it keeps holding one of its own servers until the whole downstream
 * subtree returns. That single rule is what makes failures cascade — a slow
 * database ties up the app servers calling it, their queues back up, and they
 * start shedding load. End-to-end latency is accumulated as a request threads
 * down the call path, which is what yields realistic P50/P95/P99.
 *
 * The engine is generic: it knows nothing about Kafka/Redis/etc. Behaviour comes
 * entirely from the component registry, so any graph produces the same universal
 * metrics.
 */

const MAX_DT = 250;

export interface BlueprintNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: Partial<StationConfig>;
}
export interface BlueprintEdge {
  source: string;
  target: string;
}
export interface Blueprint {
  id: string;
  title: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

export type ChaosKind = "kill" | "slow" | "partition" | "recover";
export type NodeStatus = "healthy" | "failed" | "slow" | "partitioned";

export interface NodeSnapshot {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  status: NodeStatus;
  servers: number;
  busy: number;
  queue: number;
  utilization: number; // 0–1
  completed: number;
  dropped: number;
  /** Instances/pods of this component (effective concurrency = servers × replicas). */
  replicas: number;
  /** Async queues only: messages waiting to be consumed (i.e. consumer lag). */
  backlog: number;
  bottleneck: boolean;
}
export interface EdgeSnapshot {
  id: string;
  source: string;
  target: string;
  active: boolean;
}
export interface SimSnapshot {
  time: number;
  running: boolean;
  metrics: GlobalMetrics;
  nodes: NodeSnapshot[];
  edges: EdgeSnapshot[];
  bottleneckId: string | null;
}

interface Request {
  id: number;
  start: number;
  stack: string[]; // nodes holding a server awaiting this request's downstream
}

interface Station {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  behavior: string;
  cfg: StationConfig;
  out: string[];
  // runtime
  status: NodeStatus;
  busy: number;
  queue: Request[];
  rr: number;
  penaltyMs: number;
  lossRate: number; // network partition: fraction of arrivals dropped
  completed: number;
  dropped: number;
  utilEma: number;
  backlog: number; // async queues only
  tokens: number; // rate limiters only
}

type Evt =
  | { id: number; t: number; kind: "emit"; node: string }
  | { id: number; t: number; kind: "arrive"; node: string; req: Request }
  | { id: number; t: number; kind: "done"; node: string; req: Request };

export class RequestSimEngine {
  private readonly seed: number;
  private rng: RNG;
  private blueprint: Blueprint;
  private stations = new Map<string, Station>();
  private edges: EdgeSnapshot[] = [];
  private queue: Evt[] = [];
  private evtSeq = 0;
  private reqSeq = 0;
  private time = 0;
  private running = false;
  private latency = new LatencyWindow(3000);
  private offered = new LatencyWindow(3000); // reuse window purely to count emits
  private sampleAcc = 0;

  constructor(blueprint: Blueprint, opts: { seed?: number } = {}) {
    this.seed = opts.seed ?? 1;
    this.rng = new RNG(this.seed);
    this.blueprint = blueprint;
    this.build();
  }

  private build(): void {
    this.rng = new RNG(this.seed);
    this.stations.clear();
    this.queue = [];
    this.evtSeq = 0;
    this.reqSeq = 0;
    this.time = 0;
    this.sampleAcc = 0;
    this.latency.reset();
    this.offered.reset();

    for (const n of this.blueprint.nodes) {
      const def = componentDef(n.type);
      const cfg: StationConfig = { ...(def?.defaults ?? DEFAULT_CFG), ...(n.config ?? {}) };
      this.stations.set(n.id, {
        id: n.id,
        type: n.type,
        label: n.label,
        x: n.x,
        y: n.y,
        behavior: def?.behavior ?? "service",
        cfg,
        out: [],
        status: "healthy",
        busy: 0,
        queue: [],
        rr: 0,
        penaltyMs: 0,
        lossRate: 0,
        completed: 0,
        dropped: 0,
        utilEma: 0,
        backlog: 0,
        tokens: (def?.behavior ?? "service") === "limiter" ? cfg.capacity : 0,
      });
    }

    this.edges = this.blueprint.edges.map((e) => ({
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      active: false,
    }));
    for (const e of this.blueprint.edges) {
      this.stations.get(e.source)?.out.push(e.target);
    }

    // Kick off every source.
    for (const s of this.stations.values()) {
      if (s.behavior === "source") this.scheduleEmit(s);
    }
  }

  reset(): void {
    this.running = false;
    this.build();
  }
  play(): void {
    this.running = true;
  }
  pause(): void {
    this.running = false;
  }
  isRunning(): boolean {
    return this.running;
  }

  setConfig(nodeId: string, key: keyof StationConfig, value: number): void {
    const s = this.stations.get(nodeId);
    if (s) s.cfg[key] = value;
  }

  applyChaos(nodeId: string, kind: ChaosKind): void {
    const s = this.stations.get(nodeId);
    if (!s) return;
    if (kind === "kill") s.status = "failed";
    else if (kind === "slow") {
      s.status = "slow";
      s.penaltyMs += 120;
    } else if (kind === "partition") {
      s.status = "partitioned";
      s.lossRate = 0.5; // half of arrivals time out / are dropped
    } else {
      s.status = "healthy";
      s.penaltyMs = 0;
      s.lossRate = 0;
      this.dispatch(s);
    }
  }

  /** Temporarily multiply every source's request rate to simulate a traffic spike. */
  spikeSources(multiplier: number): { id: string; original: number }[] {
    const changed: { id: string; original: number }[] = [];
    for (const s of this.stations.values()) {
      if (s.behavior === "source") {
        changed.push({ id: s.id, original: s.cfg.rps });
        s.cfg.rps = s.cfg.rps * multiplier;
      }
    }
    return changed;
  }

  // ---- event scheduling ----

  private schedule(evt: Evt): void {
    let lo = 0;
    let hi = this.queue.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const q = this.queue[mid];
      if (q.t < evt.t || (q.t === evt.t && q.id < evt.id)) lo = mid + 1;
      else hi = mid;
    }
    this.queue.splice(lo, 0, evt);
  }

  private scheduleEmit(s: Station): void {
    const rps = Math.max(0.1, s.cfg.rps);
    this.schedule({ id: this.evtSeq++, t: this.time + 1000 / rps, kind: "emit", node: s.id });
  }

  private serviceTime(s: Station): number {
    // Exponential service time gives a realistic heavy tail (drives P99).
    const mean = Math.max(0.01, s.cfg.meanServiceMs);
    const exp = -mean * Math.log(1 - this.rng.next());
    return exp + s.penaltyMs;
  }

  // ---- the simulation ----

  tick(dtMs: number): void {
    if (!this.running) return;
    const dt = Math.min(dtMs, MAX_DT);
    const target = this.time + dt;

    while (this.queue.length > 0 && this.queue[0].t <= target) {
      const evt = this.queue.shift() as Evt;
      this.time = evt.t;
      this.handle(evt);
    }
    this.time = target;

    // Sample utilisation for each node.
    for (const s of this.stations.values()) {
      const cap = this.eff(s);
      const util = cap > 0 ? s.busy / cap : 0;
      s.utilEma += 0.08 * (util - s.utilEma);
    }

    // Async queues drain into their downstream consumers at the consumers' rate.
    // Backlog grows when producers outpace consume capacity — that is the lag.
    const dtSec = dt / 1000;
    for (const s of this.stations.values()) {
      if (s.behavior !== "queue" || s.status === "failed") continue;
      const consumers = s.out
        .map((id) => this.stations.get(id))
        .filter((c): c is Station => c !== undefined && c.status !== "failed");
      let capacity = 0;
      for (const c of consumers) capacity += this.eff(c) * (1000 / Math.max(1, c.cfg.meanServiceMs)) * dtSec;
      const drained = Math.min(s.backlog, capacity);
      s.backlog -= drained;
      const frac = capacity > 0 ? drained / capacity : 0;
      for (const c of consumers) {
        c.utilEma += 0.15 * (frac - c.utilEma);
        c.completed += drained / consumers.length;
      }
      const pressure = s.cfg.capacity > 0 ? Math.min(1, s.backlog / s.cfg.capacity) : 0;
      s.utilEma += 0.15 * (pressure - s.utilEma);
    }

    // Rate limiters refill their token bucket; utilisation = how empty it is.
    for (const s of this.stations.values()) {
      if (s.behavior !== "limiter") continue;
      const cap = Math.max(1, s.cfg.capacity);
      s.tokens = Math.min(cap, s.tokens + Math.max(0, s.cfg.rate) * dtSec);
      s.utilEma += 0.1 * (1 - s.tokens / cap - s.utilEma);
    }

    this.sampleAcc += dt;
  }

  private handle(evt: Evt): void {
    if (evt.kind === "emit") {
      const s = this.stations.get(evt.node);
      if (!s) return;
      const req: Request = { id: this.reqSeq++, start: this.time, stack: [] };
      this.offered.record(this.time, 0, false);
      s.completed++; // the source emitted a request (its throughput)
      const next = this.route(s);
      if (next) this.schedule({ id: this.evtSeq++, t: this.time, kind: "arrive", node: next, req });
      else this.complete(req, false);
      this.scheduleEmit(s);
      return;
    }

    if (evt.kind === "arrive") {
      const s = this.stations.get(evt.node);
      if (!s) return this.complete(evt.req, true);
      // Network partition: a fraction of arrivals are dropped (packet loss).
      if (s.status !== "failed" && s.lossRate > 0 && this.rng.next() < s.lossRate) {
        s.dropped++;
        return this.complete(evt.req, true);
      }
      if (s.behavior === "queue") {
        // Async publish: append to the backlog and ack the producer immediately
        // (fire-and-forget). Consumers drain the backlog in tick().
        if (s.status === "failed" || s.backlog >= s.cfg.capacity) {
          s.dropped++;
          return this.complete(evt.req, true);
        }
        s.backlog++;
        s.completed++; // the broker accepted (published) a message — count it
        return this.complete(evt.req, false);
      }
      if (s.behavior === "limiter") {
        // Token bucket: spend a token to pass through, else reject (429).
        const next = this.route(s);
        if (s.status !== "failed" && s.tokens >= 1) {
          s.tokens -= 1;
          s.completed++;
          if (next && this.stations.has(next)) {
            return void this.schedule({ id: this.evtSeq++, t: this.time, kind: "arrive", node: next, req: evt.req });
          }
          return this.complete(evt.req, false);
        }
        s.dropped++;
        return this.complete(evt.req, true);
      }
      // A dead node or a full queue rejects the request.
      if (s.status === "failed" || s.queue.length >= s.cfg.capacity) {
        s.dropped++;
        return this.complete(evt.req, true);
      }
      s.queue.push(evt.req);
      this.dispatch(s);
      return;
    }

    // evt.kind === "done": local service at `node` finished for `req`.
    const s = this.stations.get(evt.node);
    if (!s) return;
    const next = this.route(s);
    if (next && this.stations.has(next)) {
      // Synchronous call: keep our server, hand the request to the downstream.
      evt.req.stack.push(s.id);
      this.schedule({ id: this.evtSeq++, t: this.time, kind: "arrive", node: next, req: evt.req });
    } else {
      // Leaf: release our server and let the request return up the call path.
      s.busy--;
      s.completed++;
      this.dispatch(s);
      this.complete(evt.req, false);
    }
  }

  /** Effective concurrency: per-instance servers × replica (pod) count. */
  private eff(s: Station): number {
    return s.cfg.servers * Math.max(1, s.cfg.replicas);
  }

  private dispatch(s: Station): void {
    while (s.status !== "failed" && s.busy < this.eff(s) && s.queue.length > 0) {
      const req = s.queue.shift() as Request;
      s.busy++;
      this.schedule({ id: this.evtSeq++, t: this.time + this.serviceTime(s), kind: "done", node: s.id, req });
    }
  }

  /** Release every server held up the call stack (return path is instantaneous). */
  private complete(req: Request, isError: boolean): void {
    while (req.stack.length > 0) {
      const caller = this.stations.get(req.stack.pop() as string);
      if (!caller) continue;
      caller.busy--;
      if (!isError) caller.completed++;
      this.dispatch(caller);
    }
    this.latency.record(this.time, this.time - req.start, isError);
  }

  private route(s: Station): string | null {
    if (s.out.length === 0) return null;
    switch (s.behavior) {
      case "datastore":
        return null;
      case "cache":
        return this.rng.next() < s.cfg.hitRatio ? null : s.out[0];
      case "router": {
        // Round-robin load balancing across downstream targets.
        const target = s.out[s.rr % s.out.length];
        s.rr++;
        return target;
      }
      case "source":
      case "service":
      default:
        return s.out[0];
    }
  }

  getSnapshot(): SimSnapshot {
    const offeredMetrics = this.offered.compute(this.time, 0);
    const metrics = this.latency.compute(this.time, offeredMetrics.throughput);

    // Bottleneck = the busiest node that is actually doing work.
    let bottleneckId: string | null = null;
    let maxUtil = 0.5; // must be meaningfully loaded to count
    for (const s of this.stations.values()) {
      if (s.utilEma > maxUtil) {
        maxUtil = s.utilEma;
        bottleneckId = s.id;
      }
    }

    const nodes: NodeSnapshot[] = [];
    for (const s of this.stations.values()) {
      nodes.push({
        id: s.id,
        type: s.type,
        label: s.label,
        x: s.x,
        y: s.y,
        status: s.status,
        servers: s.cfg.servers,
        busy: s.busy,
        queue: s.queue.length,
        utilization: Math.min(1, s.utilEma),
        completed: Math.round(s.completed),
        dropped: s.dropped,
        replicas: s.cfg.replicas,
        backlog: Math.round(s.backlog),
        bottleneck: s.id === bottleneckId,
      });
    }

    const edges = this.edges.map((e) => {
      const src = this.stations.get(e.source);
      const tgt = this.stations.get(e.target);
      return { ...e, active: Boolean((src && src.busy > 0) || (tgt && tgt.busy > 0)) };
    });

    return {
      time: this.time,
      running: this.running,
      metrics,
      nodes,
      edges,
      bottleneckId,
    };
  }
}

const DEFAULT_CFG: StationConfig = {
  servers: 4,
  meanServiceMs: 20,
  capacity: 50,
  hitRatio: 0,
  rps: 0,
  rate: 0,
  replicas: 1,
};
