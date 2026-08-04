/**
 * Component Registry — the data-driven catalogue of building blocks every
 * architecture is made of. Adding a new component type is a data change here;
 * the engine and UI need no edits. This is the reusable "18 component types"
 * layer: each entry declares how the component behaves as a queueing station.
 */

export type BehaviorKind =
  | "source"
  | "router"
  | "service"
  | "cache"
  | "datastore"
  | "queue"
  | "limiter";
export type Category = "client" | "network" | "compute" | "cache" | "data" | "messaging";

/** Tunable numeric properties a station can have. Not every field applies to every type. */
export interface StationConfig {
  /** Concurrent servers / threads / connections (parallelism at this node). */
  servers: number;
  /** Mean service time in ms (exponentially distributed for realistic tails). */
  meanServiceMs: number;
  /** Max requests that can wait in the queue before new ones are dropped. */
  capacity: number;
  /** Cache only: probability a request is a hit (returns without going downstream). */
  hitRatio: number;
  /** Source only: requests emitted per second. */
  rps: number;
  /** Rate-limiter only: tokens refilled per second (admitted rate). */
  rate: number;
  /** Instances/pods of this component. Effective concurrency = servers × replicas. */
  replicas: number;
}

export interface ComponentConfigField {
  key: keyof StationConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Display as a 0–100% control even though stored 0–1. */
  percent?: boolean;
  help?: string;
}

export interface ComponentDef {
  type: string;
  label: string;
  category: Category;
  icon: string;
  behavior: BehaviorKind;
  description: string;
  defaults: StationConfig;
  /** Which config fields the inspector exposes for this component. */
  config: ComponentConfigField[];
}

const BASE: StationConfig = {
  servers: 4,
  meanServiceMs: 20,
  capacity: 50,
  hitRatio: 0,
  rps: 0,
  rate: 0,
  replicas: 1,
};

const F = {
  servers: (max = 32): ComponentConfigField => ({ key: "servers", label: "Servers", min: 1, max, step: 1 }),
  service: (max = 200): ComponentConfigField => ({ key: "meanServiceMs", label: "Service time", min: 1, max, step: 1, unit: "ms" }),
  capacity: (): ComponentConfigField => ({ key: "capacity", label: "Queue capacity", min: 5, max: 200, step: 5 }),
  rps: (): ComponentConfigField => ({ key: "rps", label: "Requests", min: 1, max: 500, step: 1, unit: "rps" }),
  hitRatio: (): ComponentConfigField => ({ key: "hitRatio", label: "Hit ratio", min: 0, max: 1, step: 0.05, percent: true }),
  replicas: (max = 8): ComponentConfigField => ({ key: "replicas", label: "Replicas (pods)", min: 1, max, step: 1 }),
};

export const COMPONENTS: Record<string, ComponentDef> = {
  client: {
    type: "client",
    label: "Client",
    category: "client",
    icon: "👥",
    behavior: "source",
    description: "Generates request traffic at a fixed rate.",
    defaults: { ...BASE, servers: 1, meanServiceMs: 0, capacity: 0, rps: 60 },
    config: [F.rps()],
  },
  "load-balancer": {
    type: "load-balancer",
    label: "Load Balancer",
    category: "network",
    icon: "⚖️",
    behavior: "router",
    description: "Distributes requests round-robin across its downstream targets.",
    defaults: { ...BASE, servers: 64, meanServiceMs: 1, capacity: 1000 },
    config: [F.service(20), F.replicas()],
  },
  "api-gateway": {
    type: "api-gateway",
    label: "API Gateway",
    category: "network",
    icon: "🚪",
    behavior: "router",
    description: "Entry point that authenticates and routes to a backend.",
    defaults: { ...BASE, servers: 32, meanServiceMs: 3, capacity: 500 },
    config: [F.servers(64), F.service(50), F.replicas()],
  },
  service: {
    type: "service",
    label: "Service",
    category: "compute",
    icon: "⚙️",
    behavior: "service",
    description: "An application server. Holds a worker while calling its dependency.",
    defaults: { ...BASE, servers: 4, meanServiceMs: 20, capacity: 50 },
    config: [F.servers(32), F.service(200), F.capacity(), F.replicas()],
  },
  cache: {
    type: "cache",
    label: "Cache",
    category: "cache",
    icon: "⚡",
    behavior: "cache",
    description: "On a hit, returns immediately; on a miss, calls its downstream store.",
    defaults: { ...BASE, servers: 32, meanServiceMs: 1, capacity: 1000, hitRatio: 0.8 },
    config: [F.hitRatio(), F.service(20), F.replicas()],
  },
  database: {
    type: "database",
    label: "Database",
    category: "data",
    icon: "🗄️",
    behavior: "datastore",
    description: "A terminal datastore. Limited connections make it a common bottleneck.",
    defaults: { ...BASE, servers: 8, meanServiceMs: 15, capacity: 40 },
    config: [F.servers(32), F.service(200), F.capacity(), F.replicas()],
  },
  queue: {
    type: "queue",
    label: "Message Queue",
    category: "messaging",
    icon: "📨",
    behavior: "queue",
    description:
      "An async broker (e.g. Kafka). Producers publish and return immediately; consumers drain the backlog. Backlog = consumer lag.",
    defaults: { ...BASE, servers: 1, meanServiceMs: 1, capacity: 5000 },
    config: [{ key: "capacity", label: "Max backlog", min: 200, max: 10000, step: 200 }],
  },
  worker: {
    type: "worker",
    label: "Worker / Consumer",
    category: "compute",
    icon: "🛠️",
    behavior: "service",
    description: "Consumes messages from a queue. Add workers to drain the backlog faster.",
    defaults: { ...BASE, servers: 2, meanServiceMs: 40, capacity: 50 },
    config: [F.servers(16), F.service(200), F.replicas()],
  },
  cdn: {
    type: "cdn",
    label: "CDN",
    category: "network",
    icon: "🌐",
    behavior: "cache",
    description: "Edge cache close to users. Serves cached assets instantly; misses go to origin.",
    defaults: { ...BASE, servers: 128, meanServiceMs: 1, capacity: 2000, hitRatio: 0.9 },
    config: [F.hitRatio(), F.service(20), F.replicas()],
  },
  "replica-set": {
    type: "replica-set",
    label: "Replica Set",
    category: "data",
    icon: "🧩",
    behavior: "datastore",
    description: "A pool of read replicas behind one endpoint. More replicas → more read capacity.",
    defaults: { ...BASE, servers: 24, meanServiceMs: 12, capacity: 120 },
    config: [F.servers(64), F.service(200), F.capacity(), F.replicas()],
  },
  "rate-limiter": {
    type: "rate-limiter",
    label: "Rate Limiter",
    category: "network",
    icon: "🚦",
    behavior: "limiter",
    description: "Token bucket. Admits up to a fixed rate and rejects the rest with a 429.",
    defaults: { ...BASE, servers: 1, meanServiceMs: 0, capacity: 20, rate: 30 },
    config: [
      { key: "rate", label: "Rate", min: 5, max: 300, step: 5, unit: "rps" },
      { key: "capacity", label: "Burst", min: 1, max: 100, step: 1 },
    ],
  },
  "search-index": {
    type: "search-index",
    label: "Search Index",
    category: "data",
    icon: "🔎",
    behavior: "datastore",
    description: "Full-text search (e.g. Elasticsearch). Fast reads over an inverted index; rebuilt offline.",
    defaults: { ...BASE, servers: 16, meanServiceMs: 8, capacity: 80 },
    config: [F.servers(64), F.service(200), F.capacity(), F.replicas()],
  },
  "object-storage": {
    type: "object-storage",
    label: "Object Storage",
    category: "data",
    icon: "🪣",
    behavior: "datastore",
    description: "Blob store (e.g. S3). Huge capacity for files and assets; effectively unlimited scale.",
    defaults: { ...BASE, servers: 128, meanServiceMs: 12, capacity: 500 },
    config: [F.servers(256), F.service(200), F.capacity(), F.replicas()],
  },
  "auth-service": {
    type: "auth-service",
    label: "Auth Service",
    category: "compute",
    icon: "🔑",
    behavior: "service",
    description: "Validates tokens/sessions. Sits on the hot path of most requests, so it must be fast and scaled.",
    defaults: { ...BASE, servers: 8, meanServiceMs: 5 },
    config: [F.servers(32), F.service(200), F.replicas()],
  },
  "stream-processor": {
    type: "stream-processor",
    label: "Stream Processor",
    category: "messaging",
    icon: "🌊",
    behavior: "service",
    description: "Consumes an event stream and transforms it (e.g. Flink / Kafka Streams). Scale with more instances.",
    defaults: { ...BASE, servers: 4, meanServiceMs: 30 },
    config: [F.servers(24), F.service(200), F.replicas()],
  },
};

export function componentDef(type: string): ComponentDef | undefined {
  return COMPONENTS[type];
}

export function componentList(): ComponentDef[] {
  return Object.values(COMPONENTS);
}
