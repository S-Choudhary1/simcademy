import type { Blueprint } from "./engine";

/**
 * Real-world architecture blueprints. Each is a genuine service graph the
 * request-routing engine models directly, so the page can embed a live sim.
 */

export interface Architecture {
  slug: string;
  name: string;
  blurb: string;
  blueprint: Blueprint;
}

export const ARCHITECTURES: Architecture[] = [
  {
    slug: "url-shortener",
    name: "URL Shortener",
    blurb: "Read-heavy redirect service — a cache absorbs the hot links so the database barely moves.",
    blueprint: {
      id: "url-shortener",
      title: "URL Shortener",
      nodes: [
        { id: "client", type: "client", label: "Browsers", x: 40, y: 190, config: { rps: 200 } },
        { id: "lb", type: "load-balancer", label: "Load Balancer", x: 250, y: 190, config: { replicas: 2 } },
        { id: "app-1", type: "service", label: "Redirect App A", x: 470, y: 100, config: { servers: 6, meanServiceMs: 6, replicas: 3 } },
        { id: "app-2", type: "service", label: "Redirect App B", x: 470, y: 280, config: { servers: 6, meanServiceMs: 6, replicas: 3 } },
        { id: "cache", type: "cache", label: "Redis", x: 690, y: 190, config: { hitRatio: 0.9 } },
        { id: "db", type: "database", label: "Postgres", x: 910, y: 190, config: { servers: 8, meanServiceMs: 12, replicas: 2 } },
      ],
      edges: [
        { source: "client", target: "lb" },
        { source: "lb", target: "app-1" },
        { source: "lb", target: "app-2" },
        { source: "app-1", target: "cache" },
        { source: "app-2", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
  {
    slug: "whatsapp",
    name: "WhatsApp / Chat",
    blurb: "Async message delivery — the chat service publishes to a broker and consumers fan out delivery.",
    blueprint: {
      id: "whatsapp",
      title: "WhatsApp / Chat",
      nodes: [
        { id: "client", type: "client", label: "Users", x: 30, y: 200, config: { rps: 120 } },
        { id: "gateway", type: "api-gateway", label: "Gateway", x: 220, y: 200, config: { replicas: 2 } },
        { id: "chat", type: "service", label: "Chat Service", x: 430, y: 200, config: { servers: 10, meanServiceMs: 8, replicas: 4 } },
        { id: "broker", type: "queue", label: "Kafka", x: 640, y: 200 },
        { id: "d-1", type: "worker", label: "Delivery 1", x: 850, y: 110, config: { servers: 2, meanServiceMs: 25, replicas: 2 } },
        { id: "d-2", type: "worker", label: "Delivery 2", x: 850, y: 200, config: { servers: 2, meanServiceMs: 25, replicas: 2 } },
        { id: "d-3", type: "worker", label: "Delivery 3", x: 850, y: 290, config: { servers: 2, meanServiceMs: 25, replicas: 2 } },
      ],
      edges: [
        { source: "client", target: "gateway" },
        { source: "gateway", target: "chat" },
        { source: "chat", target: "broker" },
        { source: "broker", target: "d-1" },
        { source: "broker", target: "d-2" },
        { source: "broker", target: "d-3" },
      ],
    },
  },
  {
    slug: "netflix",
    name: "Netflix",
    blurb: "A CDN edge serves the vast majority of requests; only misses reach the origin API stack.",
    blueprint: {
      id: "netflix",
      title: "Netflix",
      nodes: [
        { id: "client", type: "client", label: "Viewers", x: 20, y: 200, config: { rps: 260 } },
        { id: "cdn", type: "cdn", label: "CDN Edge", x: 200, y: 200, config: { hitRatio: 0.95 } },
        { id: "gateway", type: "api-gateway", label: "API Gateway", x: 410, y: 200, config: { replicas: 3 } },
        { id: "svc-1", type: "service", label: "Service A", x: 620, y: 110, config: { replicas: 3 } },
        { id: "svc-2", type: "service", label: "Service B", x: 620, y: 290, config: { replicas: 3 } },
        { id: "cache", type: "cache", label: "Cache", x: 830, y: 200, config: { hitRatio: 0.8, replicas: 2 } },
        { id: "db", type: "database", label: "Database", x: 1040, y: 200 },
      ],
      edges: [
        { source: "client", target: "cdn" },
        { source: "cdn", target: "gateway" },
        { source: "gateway", target: "svc-1" },
        { source: "gateway", target: "svc-2" },
        { source: "svc-1", target: "cache" },
        { source: "svc-2", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
  {
    slug: "payment-gateway",
    name: "Payment Gateway",
    blurb: "A rate limiter shields the payment service; writes land in a ledger DB — correctness over throughput.",
    blueprint: {
      id: "payment-gateway",
      title: "Payment Gateway",
      nodes: [
        { id: "client", type: "client", label: "Merchants", x: 40, y: 190, config: { rps: 60 } },
        { id: "limiter", type: "rate-limiter", label: "Rate Limiter", x: 240, y: 190, config: { rate: 40, capacity: 20 } },
        { id: "gateway", type: "api-gateway", label: "API Gateway", x: 450, y: 190, config: { replicas: 2 } },
        { id: "pay", type: "service", label: "Payment Service", x: 660, y: 190, config: { servers: 6, meanServiceMs: 30, replicas: 2 } },
        { id: "db", type: "database", label: "Ledger DB", x: 880, y: 190, config: { servers: 8, meanServiceMs: 20 } },
      ],
      edges: [
        { source: "client", target: "limiter" },
        { source: "limiter", target: "gateway" },
        { source: "gateway", target: "pay" },
        { source: "pay", target: "db" },
      ],
    },
  },
  {
    slug: "news-feed",
    name: "News Feed / Timeline",
    blurb: "Fan-out on write precomputes each user's timeline, so the read path is a near-instant cache hit.",
    blueprint: {
      id: "news-feed",
      title: "News Feed / Timeline",
      nodes: [
        { id: "client", type: "client", label: "Users", x: 30, y: 190, config: { rps: 240 } },
        { id: "gateway", type: "api-gateway", label: "API Gateway", x: 240, y: 190, config: { replicas: 3 } },
        { id: "feed", type: "service", label: "Feed Service", x: 450, y: 190, config: { servers: 8, meanServiceMs: 6, replicas: 3 } },
        { id: "cache", type: "cache", label: "Feed Cache (Redis)", x: 670, y: 190, config: { hitRatio: 0.92 } },
        { id: "db", type: "database", label: "Postgres", x: 890, y: 190, config: { servers: 8, meanServiceMs: 14, replicas: 2 } },
      ],
      edges: [
        { source: "client", target: "gateway" },
        { source: "gateway", target: "feed" },
        { source: "feed", target: "cache" },
        { source: "cache", target: "db" },
      ],
    },
  },
  {
    slug: "typeahead",
    name: "Typeahead / Autocomplete",
    blurb: "Every keystroke is a query; a prefix cache absorbs the hot prefixes so the search index barely moves.",
    blueprint: {
      id: "typeahead",
      title: "Typeahead / Autocomplete",
      nodes: [
        { id: "client", type: "client", label: "Keystrokes", x: 30, y: 190, config: { rps: 320 } },
        { id: "gateway", type: "api-gateway", label: "API Gateway", x: 230, y: 190, config: { replicas: 3 } },
        { id: "svc", type: "service", label: "Autocomplete Svc", x: 450, y: 190, config: { servers: 10, meanServiceMs: 4, replicas: 3 } },
        { id: "cache", type: "cache", label: "Prefix Cache (Redis)", x: 680, y: 190, config: { hitRatio: 0.9 } },
        { id: "index", type: "database", label: "Search Index", x: 900, y: 190, config: { servers: 12, meanServiceMs: 10, replicas: 2 } },
      ],
      edges: [
        { source: "client", target: "gateway" },
        { source: "gateway", target: "svc" },
        { source: "svc", target: "cache" },
        { source: "cache", target: "index" },
      ],
    },
  },
];

export const ARCH_BY_SLUG: Record<string, Architecture> = Object.fromEntries(
  ARCHITECTURES.map((a) => [a.slug, a]),
);
