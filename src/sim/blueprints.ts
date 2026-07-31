import type { Blueprint } from "./engine";
import { ARCHITECTURES } from "./architectures";

/**
 * Blueprints are pure data: nodes (with a registry component `type`), positions,
 * and edges. Each technology has three of increasing depth so the difficulty
 * toggle can swap the whole simulation, not just the prose.
 */

export type Tech = "redis" | "postgresql" | "kafka" | "mongodb" | "rabbitmq" | "nginx";
export type Level = "beginner" | "intermediate" | "advanced";

export interface BlueprintMeta {
  id: string;
  title: string;
  summary: string;
  /** Key ideas this level introduces (rendered as chips in the callout). */
  concepts?: string[];
  /** A concrete experiment to try at this level. */
  tryThis?: string;
  blueprint: Blueprint;
}

// ---------------------------------------------------------------- sandbox

export const webServiceBlueprint: Blueprint = {
  id: "sandbox",
  title: "Sandbox — Web Service",
  nodes: [
    { id: "client", type: "client", label: "Clients", x: 40, y: 180, config: { rps: 80 } },
    { id: "gateway", type: "api-gateway", label: "API Gateway", x: 240, y: 180 },
    { id: "lb", type: "load-balancer", label: "Load Balancer", x: 440, y: 180 },
    { id: "svc-1", type: "service", label: "Service A", x: 650, y: 90 },
    { id: "svc-2", type: "service", label: "Service B", x: 650, y: 270 },
    { id: "cache", type: "cache", label: "Redis Cache", x: 860, y: 180 },
    { id: "db", type: "database", label: "PostgreSQL", x: 1070, y: 180 },
  ],
  edges: [
    { source: "client", target: "gateway" },
    { source: "gateway", target: "lb" },
    { source: "lb", target: "svc-1" },
    { source: "lb", target: "svc-2" },
    { source: "svc-1", target: "cache" },
    { source: "svc-2", target: "cache" },
    { source: "cache", target: "db" },
  ],
};

// ---------------------------------------------------------------- Redis

const redis: Record<Level, BlueprintMeta> = {
  beginner: {
    id: "redis-beginner",
    title: "Cache-aside basics",
    summary:
      "A cache sits in front of the database. Hits return in ~1ms; misses fall through to the DB. Drag the hit ratio on the cache and watch p99 and DB load move.",
    concepts: ["Cache hit / miss", "Read latency"],
    tryThis: "Drop the hit ratio toward 0.3 and watch p99 and DB load jump.",
    blueprint: {
      id: "redis-beginner",
      title: "Redis · Beginner",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 60, y: 160, config: { rps: 60 } },
        { id: "cache", type: "cache", label: "Redis", x: 340, y: 160, config: { hitRatio: 0.8 } },
        { id: "db", type: "database", label: "Database", x: 620, y: 160 },
      ],
      edges: [
        { source: "client", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
  intermediate: {
    id: "redis-intermediate",
    title: "Cache behind an app tier",
    summary:
      "A service reads through the cache. Lower the hit ratio and the database becomes the bottleneck; raise it and latency collapses back toward the cache path.",
    concepts: ["Cache-aside", "Hit ratio", "Bottleneck shift"],
    tryThis: "Lower the hit ratio until the Database becomes the bottleneck.",
    blueprint: {
      id: "redis-intermediate",
      title: "Redis · Intermediate",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 40, y: 170, config: { rps: 90 } },
        { id: "svc", type: "service", label: "Service", x: 280, y: 170, config: { servers: 6 } },
        { id: "cache", type: "cache", label: "Redis", x: 540, y: 170, config: { hitRatio: 0.75 } },
        { id: "db", type: "database", label: "Database", x: 800, y: 170 },
      ],
      edges: [
        { source: "client", target: "svc" },
        { source: "svc", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
  advanced: {
    id: "redis-advanced",
    title: "Cache shielding a DB under load",
    summary:
      "Two services behind a load balancer share one cache in front of the DB. Push the traffic up: the cache absorbs most reads so the database survives. Kill the cache to see the DB get stampeded.",
    concepts: ["Load balancing", "Cache offload", "Cache stampede"],
    tryThis: "Kill the cache while traffic is high and watch the database get stampeded.",
    blueprint: {
      id: "redis-advanced",
      title: "Redis · Advanced",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 40, y: 200, config: { rps: 160 } },
        { id: "lb", type: "load-balancer", label: "Load Balancer", x: 250, y: 200 },
        { id: "svc-1", type: "service", label: "Service A", x: 470, y: 110 },
        { id: "svc-2", type: "service", label: "Service B", x: 470, y: 290 },
        { id: "cache", type: "cache", label: "Redis", x: 700, y: 200, config: { hitRatio: 0.85 } },
        { id: "db", type: "database", label: "Database", x: 940, y: 200 },
      ],
      edges: [
        { source: "client", target: "lb" },
        { source: "lb", target: "svc-1" },
        { source: "lb", target: "svc-2" },
        { source: "svc-1", target: "cache" },
        { source: "svc-2", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
};

// ---------------------------------------------------------------- PostgreSQL

const postgresql: Record<Level, BlueprintMeta> = {
  beginner: {
    id: "postgresql-beginner",
    title: "One app, one database",
    summary:
      "Every request hits the single database. Raise the traffic and the DB's limited connections saturate — the classic first scaling wall.",
    concepts: ["Connection limits", "Saturation"],
    tryThis: "Raise traffic until the database sits near 100% utilisation.",
    blueprint: {
      id: "postgresql-beginner",
      title: "PostgreSQL · Beginner",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 60, y: 160, config: { rps: 70 } },
        { id: "svc", type: "service", label: "Service", x: 340, y: 160, config: { servers: 8 } },
        { id: "db", type: "database", label: "Primary DB", x: 620, y: 160 },
      ],
      edges: [
        { source: "client", target: "svc" },
        { source: "svc", target: "db" },
      ],
    },
  },
  intermediate: {
    id: "postgresql-intermediate",
    title: "Offload reads with a cache",
    summary:
      "A cache in front of the database soaks up repeat reads so the DB only sees misses. The first, cheapest way to buy the primary headroom.",
    concepts: ["Read offload", "Cache-aside"],
    tryThis: "Compare DB load with the cache hit ratio at 0.3 versus 0.8.",
    blueprint: {
      id: "postgresql-intermediate",
      title: "PostgreSQL · Intermediate",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 40, y: 170, config: { rps: 110 } },
        { id: "svc", type: "service", label: "Service", x: 300, y: 170, config: { servers: 8 } },
        { id: "cache", type: "cache", label: "Cache", x: 560, y: 170, config: { hitRatio: 0.7 } },
        { id: "db", type: "database", label: "Primary DB", x: 820, y: 170 },
      ],
      edges: [
        { source: "client", target: "svc" },
        { source: "svc", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
  advanced: {
    id: "postgresql-advanced",
    title: "Read replicas for read scaling",
    summary:
      "Reads fan out across replicas via a load balancer while the cache absorbs the hottest keys. Adding replicas scales reads — the write path (a single primary) is a separate problem.",
    concepts: ["Read replicas", "Read scaling", "Write bottleneck"],
    tryThis: "Push traffic up — reads fan out across replicas while the single write path stays fixed.",
    blueprint: {
      id: "postgresql-advanced",
      title: "PostgreSQL · Advanced",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 30, y: 210, config: { rps: 220 } },
        { id: "lb", type: "load-balancer", label: "Load Balancer", x: 220, y: 210 },
        { id: "svc-1", type: "service", label: "Service A", x: 420, y: 120 },
        { id: "svc-2", type: "service", label: "Service B", x: 420, y: 300 },
        { id: "cache", type: "cache", label: "Cache", x: 640, y: 210, config: { hitRatio: 0.6 } },
        { id: "db-lb", type: "load-balancer", label: "Read Router", x: 860, y: 210 },
        { id: "db-1", type: "database", label: "Primary", x: 1080, y: 110 },
        { id: "db-2", type: "database", label: "Replica 1", x: 1080, y: 210 },
        { id: "db-3", type: "database", label: "Replica 2", x: 1080, y: 310 },
      ],
      edges: [
        { source: "client", target: "lb" },
        { source: "lb", target: "svc-1" },
        { source: "lb", target: "svc-2" },
        { source: "svc-1", target: "cache" },
        { source: "svc-2", target: "cache" },
        { source: "cache", target: "db-lb" },
        { source: "db-lb", target: "db-1" },
        { source: "db-lb", target: "db-2" },
        { source: "db-lb", target: "db-3" },
      ],
    },
  },
};

// ---------------------------------------------------------------- Kafka

const kafka: Record<Level, BlueprintMeta> = {
  beginner: {
    id: "kafka-beginner",
    title: "Producer → broker → consumer",
    summary:
      "One producer publishes to the broker; one consumer drains it. Because the producer outruns a single consumer, the backlog (consumer lag) grows — the broker's headline metric.",
    concepts: ["Async publish", "Consumer lag", "Backpressure"],
    tryThis: "Watch the broker backlog climb while the producer's latency stays low.",
    blueprint: {
      id: "kafka-beginner",
      title: "Kafka · Beginner",
      nodes: [
        { id: "client", type: "client", label: "Producer", x: 60, y: 160, config: { rps: 45 } },
        { id: "broker", type: "queue", label: "Kafka Broker", x: 340, y: 160 },
        { id: "consumer", type: "worker", label: "Consumer", x: 620, y: 160, config: { servers: 1, meanServiceMs: 30 } },
      ],
      edges: [
        { source: "client", target: "broker" },
        { source: "broker", target: "consumer" },
      ],
    },
  },
  intermediate: {
    id: "kafka-intermediate",
    title: "Consumer group scaling",
    summary:
      "Two consumers form a group and share the load, so total consume capacity now keeps up with the producer and the backlog stays near zero. Push the traffic up to make it lag again.",
    concepts: ["Consumer groups", "Horizontal scaling"],
    tryThis: "Hit ⚡ Spike to make even two consumers fall behind for a moment.",
    blueprint: {
      id: "kafka-intermediate",
      title: "Kafka · Intermediate",
      nodes: [
        { id: "client", type: "client", label: "Producer", x: 60, y: 180, config: { rps: 60 } },
        { id: "broker", type: "queue", label: "Kafka Broker", x: 340, y: 180 },
        { id: "c-1", type: "worker", label: "Consumer 1", x: 620, y: 100, config: { servers: 1, meanServiceMs: 30 } },
        { id: "c-2", type: "worker", label: "Consumer 2", x: 620, y: 260, config: { servers: 1, meanServiceMs: 30 } },
      ],
      edges: [
        { source: "client", target: "broker" },
        { source: "broker", target: "c-1" },
        { source: "broker", target: "c-2" },
      ],
    },
  },
  advanced: {
    id: "kafka-advanced",
    title: "Decoupled event pipeline",
    summary:
      "An API publishes events and returns instantly — client latency stays flat no matter how big the backlog grows. Three consumers process asynchronously. This is the whole point of a broker: decoupling producer latency from consumer throughput.",
    concepts: ["Decoupling", "Event pipeline", "Elastic consumers"],
    tryThis: "Note client latency stays flat while the backlog builds — that is the decoupling.",
    blueprint: {
      id: "kafka-advanced",
      title: "Kafka · Advanced",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 30, y: 210, config: { rps: 120 } },
        { id: "api", type: "service", label: "Ingest API", x: 240, y: 210, config: { servers: 8, meanServiceMs: 8 } },
        { id: "broker", type: "queue", label: "Kafka Broker", x: 470, y: 210 },
        { id: "w-1", type: "worker", label: "Consumer 1", x: 700, y: 110, config: { servers: 2, meanServiceMs: 40 } },
        { id: "w-2", type: "worker", label: "Consumer 2", x: 700, y: 210, config: { servers: 2, meanServiceMs: 40 } },
        { id: "w-3", type: "worker", label: "Consumer 3", x: 700, y: 310, config: { servers: 2, meanServiceMs: 40 } },
      ],
      edges: [
        { source: "client", target: "api" },
        { source: "api", target: "broker" },
        { source: "broker", target: "w-1" },
        { source: "broker", target: "w-2" },
        { source: "broker", target: "w-3" },
      ],
    },
  },
};

// ---------------------------------------------------------------- MongoDB

const mongodb: Record<Level, BlueprintMeta> = {
  beginner: {
    id: "mongodb-beginner",
    title: "App and a document store",
    summary: "A service reads and writes documents to a single MongoDB node. Raise traffic to find its ceiling.",
    concepts: ["Document model", "Single node"],
    tryThis: "Raise traffic until MongoDB saturates and latency climbs.",
    blueprint: {
      id: "mongodb-beginner",
      title: "MongoDB · Beginner",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 60, y: 160, config: { rps: 70 } },
        { id: "svc", type: "service", label: "Service", x: 340, y: 160, config: { servers: 8 } },
        { id: "db", type: "database", label: "MongoDB", x: 620, y: 160 },
      ],
      edges: [
        { source: "client", target: "svc" },
        { source: "svc", target: "db" },
      ],
    },
  },
  intermediate: {
    id: "mongodb-intermediate",
    title: "Cache the hot documents",
    summary: "A cache in front of MongoDB absorbs repeated reads so the database only sees misses.",
    concepts: ["Read caching", "Working set"],
    tryThis: "Lower the hit ratio and watch MongoDB load rise.",
    blueprint: {
      id: "mongodb-intermediate",
      title: "MongoDB · Intermediate",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 40, y: 170, config: { rps: 110 } },
        { id: "svc", type: "service", label: "Service", x: 300, y: 170, config: { servers: 8 } },
        { id: "cache", type: "cache", label: "Cache", x: 560, y: 170, config: { hitRatio: 0.7 } },
        { id: "db", type: "database", label: "MongoDB", x: 820, y: 170 },
      ],
      edges: [
        { source: "client", target: "svc" },
        { source: "svc", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
  advanced: {
    id: "mongodb-advanced",
    title: "Sharding for write scale",
    summary: "A mongos router spreads data across shards, so writes scale horizontally — unlike read replicas, which only scale reads.",
    concepts: ["Sharding", "Horizontal write scale", "Router (mongos)"],
    tryThis: "Push traffic up — load spreads across shards instead of hitting one node.",
    blueprint: {
      id: "mongodb-advanced",
      title: "MongoDB · Advanced",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 30, y: 210, config: { rps: 220 } },
        { id: "lb", type: "load-balancer", label: "Load Balancer", x: 220, y: 210 },
        { id: "svc-1", type: "service", label: "Service A", x: 420, y: 120 },
        { id: "svc-2", type: "service", label: "Service B", x: 420, y: 300 },
        { id: "mongos", type: "load-balancer", label: "mongos", x: 640, y: 210 },
        { id: "shard-1", type: "database", label: "Shard 1", x: 860, y: 110 },
        { id: "shard-2", type: "database", label: "Shard 2", x: 860, y: 210 },
        { id: "shard-3", type: "database", label: "Shard 3", x: 860, y: 310 },
      ],
      edges: [
        { source: "client", target: "lb" },
        { source: "lb", target: "svc-1" },
        { source: "lb", target: "svc-2" },
        { source: "svc-1", target: "mongos" },
        { source: "svc-2", target: "mongos" },
        { source: "mongos", target: "shard-1" },
        { source: "mongos", target: "shard-2" },
        { source: "mongos", target: "shard-3" },
      ],
    },
  },
};

// ---------------------------------------------------------------- RabbitMQ

const rabbitmq: Record<Level, BlueprintMeta> = {
  beginner: {
    id: "rabbitmq-beginner",
    title: "Work queue",
    summary: "A producer enqueues tasks; a single consumer works them off. If tasks arrive faster than they're processed, the queue backs up.",
    concepts: ["Work queue", "Consumer lag"],
    tryThis: "Watch the queue backlog grow while the producer stays fast.",
    blueprint: {
      id: "rabbitmq-beginner",
      title: "RabbitMQ · Beginner",
      nodes: [
        { id: "client", type: "client", label: "Producer", x: 60, y: 160, config: { rps: 45 } },
        { id: "queue", type: "queue", label: "RabbitMQ", x: 340, y: 160 },
        { id: "consumer", type: "worker", label: "Consumer", x: 620, y: 160, config: { servers: 1, meanServiceMs: 30 } },
      ],
      edges: [
        { source: "client", target: "queue" },
        { source: "queue", target: "consumer" },
      ],
    },
  },
  intermediate: {
    id: "rabbitmq-intermediate",
    title: "Competing consumers",
    summary: "Several consumers pull from the same queue and share the work, so throughput scales with the number of consumers.",
    concepts: ["Competing consumers", "Prefetch"],
    tryThis: "Hit ⚡ Spike to briefly overwhelm even three consumers.",
    blueprint: {
      id: "rabbitmq-intermediate",
      title: "RabbitMQ · Intermediate",
      nodes: [
        { id: "client", type: "client", label: "Producer", x: 60, y: 190, config: { rps: 80 } },
        { id: "queue", type: "queue", label: "RabbitMQ", x: 340, y: 190 },
        { id: "c-1", type: "worker", label: "Consumer 1", x: 620, y: 90, config: { servers: 1, meanServiceMs: 30 } },
        { id: "c-2", type: "worker", label: "Consumer 2", x: 620, y: 190, config: { servers: 1, meanServiceMs: 30 } },
        { id: "c-3", type: "worker", label: "Consumer 3", x: 620, y: 290, config: { servers: 1, meanServiceMs: 30 } },
      ],
      edges: [
        { source: "client", target: "queue" },
        { source: "queue", target: "c-1" },
        { source: "queue", target: "c-2" },
        { source: "queue", target: "c-3" },
      ],
    },
  },
  advanced: {
    id: "rabbitmq-advanced",
    title: "Exchange routing to queues",
    summary: "An exchange routes messages to different queues, each with its own consumers — independent pipelines for orders and emails.",
    concepts: ["Exchange routing", "Multiple queues"],
    tryThis: "Watch work split across the two queues and their workers.",
    blueprint: {
      id: "rabbitmq-advanced",
      title: "RabbitMQ · Advanced",
      nodes: [
        { id: "client", type: "client", label: "Producer", x: 40, y: 200, config: { rps: 80 } },
        { id: "exchange", type: "load-balancer", label: "Exchange", x: 250, y: 200 },
        { id: "q-orders", type: "queue", label: "orders.queue", x: 470, y: 110 },
        { id: "q-emails", type: "queue", label: "emails.queue", x: 470, y: 300 },
        { id: "w-orders", type: "worker", label: "Order Worker", x: 700, y: 110, config: { servers: 2, meanServiceMs: 30 } },
        { id: "w-emails", type: "worker", label: "Email Worker", x: 700, y: 300, config: { servers: 2, meanServiceMs: 30 } },
      ],
      edges: [
        { source: "client", target: "exchange" },
        { source: "exchange", target: "q-orders" },
        { source: "exchange", target: "q-emails" },
        { source: "q-orders", target: "w-orders" },
        { source: "q-emails", target: "w-emails" },
      ],
    },
  },
};

// ---------------------------------------------------------------- Nginx

const nginx: Record<Level, BlueprintMeta> = {
  beginner: {
    id: "nginx-beginner",
    title: "Reverse proxy",
    summary: "Nginx sits in front of a single app server as a reverse proxy — one entry point for all clients.",
    concepts: ["Reverse proxy", "Single upstream"],
    tryThis: "Raise traffic until the single app server saturates.",
    blueprint: {
      id: "nginx-beginner",
      title: "Nginx · Beginner",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 60, y: 160, config: { rps: 80 } },
        { id: "nginx", type: "load-balancer", label: "Nginx", x: 340, y: 160 },
        { id: "app", type: "service", label: "App Server", x: 620, y: 160, config: { servers: 4 } },
      ],
      edges: [
        { source: "client", target: "nginx" },
        { source: "nginx", target: "app" },
      ],
    },
  },
  intermediate: {
    id: "nginx-intermediate",
    title: "Load balancing upstreams",
    summary: "Nginx spreads requests round-robin across several app servers, so throughput scales with the pool.",
    concepts: ["Load balancing", "Upstream pool"],
    tryThis: "Add traffic and watch it spread evenly across the three app servers.",
    blueprint: {
      id: "nginx-intermediate",
      title: "Nginx · Intermediate",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 40, y: 190, config: { rps: 180 } },
        { id: "nginx", type: "load-balancer", label: "Nginx", x: 260, y: 190 },
        { id: "app-1", type: "service", label: "App 1", x: 500, y: 90 },
        { id: "app-2", type: "service", label: "App 2", x: 500, y: 190 },
        { id: "app-3", type: "service", label: "App 3", x: 500, y: 290 },
      ],
      edges: [
        { source: "client", target: "nginx" },
        { source: "nginx", target: "app-1" },
        { source: "nginx", target: "app-2" },
        { source: "nginx", target: "app-3" },
      ],
    },
  },
  advanced: {
    id: "nginx-advanced",
    title: "Edge proxy + cache + backends",
    summary: "Nginx fronts a load-balanced app tier that reads through a cache to the database — a full production edge.",
    concepts: ["Reverse proxy", "Load balancing", "Cache offload"],
    tryThis: "Kill the cache under load to see the database pressure spike.",
    blueprint: {
      id: "nginx-advanced",
      title: "Nginx · Advanced",
      nodes: [
        { id: "client", type: "client", label: "Clients", x: 30, y: 200, config: { rps: 180 } },
        { id: "nginx", type: "load-balancer", label: "Nginx", x: 230, y: 200 },
        { id: "svc-1", type: "service", label: "App 1", x: 440, y: 110 },
        { id: "svc-2", type: "service", label: "App 2", x: 440, y: 290 },
        { id: "cache", type: "cache", label: "Cache", x: 660, y: 200, config: { hitRatio: 0.8 } },
        { id: "db", type: "database", label: "Database", x: 890, y: 200 },
      ],
      edges: [
        { source: "client", target: "nginx" },
        { source: "nginx", target: "svc-1" },
        { source: "nginx", target: "svc-2" },
        { source: "svc-1", target: "cache" },
        { source: "svc-2", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
};

// ---------------------------------------------------------------- Concepts

function concept(
  id: string,
  title: string,
  summary: string,
  concepts: string[],
  tryThis: string,
  nodes: Blueprint["nodes"],
  edges: Blueprint["edges"],
): BlueprintMeta {
  return { id, title, summary, concepts, tryThis, blueprint: { id, title, nodes, edges } };
}

// Concepts that are true architectures (CQRS, Saga, Consistent Hashing) moved to
// dedicated pages with bespoke, correct visualizations under /concepts — the
// request-routing sim can't model compensation, projections, or a hash ring.

// ---------------------------------------------------------------- Patterns

export const PATTERN_BLUEPRINTS: BlueprintMeta[] = [
  concept(
    "pattern-load-balancing",
    "Load Balancing",
    "A load balancer spreads requests across a pool of identical servers, scaling throughput horizontally.",
    ["Round-robin", "Horizontal scaling"],
    "Add traffic and watch it spread evenly across the servers.",
    [
      { id: "client", type: "client", label: "Clients", x: 40, y: 190, config: { rps: 180 } },
      { id: "lb", type: "load-balancer", label: "Load Balancer", x: 280, y: 190 },
      { id: "a-1", type: "service", label: "Server 1", x: 520, y: 90 },
      { id: "a-2", type: "service", label: "Server 2", x: 520, y: 190 },
      { id: "a-3", type: "service", label: "Server 3", x: 520, y: 290 },
    ],
    [
      { source: "client", target: "lb" },
      { source: "lb", target: "a-1" },
      { source: "lb", target: "a-2" },
      { source: "lb", target: "a-3" },
    ],
  ),
  concept(
    "pattern-api-gateway",
    "API Gateway",
    "A single entry point authenticates requests and routes them out to the right backend service.",
    ["Single entry point", "Routing", "Auth"],
    "One gateway fans requests out to the Users, Orders, and Payments services.",
    [
      { id: "client", type: "client", label: "Clients", x: 40, y: 200, config: { rps: 120 } },
      { id: "gw", type: "api-gateway", label: "API Gateway", x: 260, y: 200 },
      { id: "users", type: "service", label: "Users", x: 500, y: 110 },
      { id: "orders", type: "service", label: "Orders", x: 500, y: 200 },
      { id: "payments", type: "service", label: "Payments", x: 500, y: 290 },
    ],
    [
      { source: "client", target: "gw" },
      { source: "gw", target: "users" },
      { source: "gw", target: "orders" },
      { source: "gw", target: "payments" },
    ],
  ),
];

export const TECH_BLUEPRINTS: Record<Tech, Record<Level, BlueprintMeta>> = {
  redis,
  postgresql,
  kafka,
  mongodb,
  rabbitmq,
  nginx,
};

export const SANDBOX_META: BlueprintMeta = {
  id: "sandbox",
  title: "Sandbox — Web Service",
  summary: "A full web-service stack to experiment with. Add, connect, and break anything.",
  blueprint: webServiceBlueprint,
};

const techGroup = (name: string, t: Record<Level, BlueprintMeta>): { group: string; items: BlueprintMeta[] } => ({
  group: name,
  items: [t.beginner, t.intermediate, t.advanced],
});

const ARCHITECTURE_META: BlueprintMeta[] = ARCHITECTURES.map((a) => ({
  id: a.blueprint.id,
  title: a.name,
  summary: a.blurb,
  blueprint: a.blueprint,
}));

export const BLUEPRINT_CATALOG: { group: string; items: BlueprintMeta[] }[] = [
  { group: "Sandbox", items: [SANDBOX_META] },
  { group: "Architectures", items: ARCHITECTURE_META },
  techGroup("Redis", redis),
  techGroup("PostgreSQL", postgresql),
  techGroup("Kafka", kafka),
  techGroup("MongoDB", mongodb),
  techGroup("RabbitMQ", rabbitmq),
  techGroup("Nginx", nginx),
  { group: "Patterns", items: PATTERN_BLUEPRINTS },
];
