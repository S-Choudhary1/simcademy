# Simcademy

**An interactive academy for system design.** Learn distributed systems, databases, and backend engineering through browser-based simulations you can run, tune, and break — not static diagrams.

## What's inside

- **Request Playground** — build a system from components (services, caches, queues, load balancers, databases), send real traffic through it, and watch latency (p50/p95/p99), throughput, and errors respond. Inject failures, add pods, auto-scale, and read a live "what's happening" explainer.
- **Interactive concepts** — purpose-built, fact-checked visualizations for CAP, ACID, isolation levels & MVCC, consensus (Raft), sharding, consistent hashing, rate limiting, delivery semantics, retries/backoff, sagas, and more.
- **Technology deep-dives** — Kafka, PostgreSQL, MongoDB, Redis, Cassandra, RabbitMQ, Nginx — with their internals visualized.
- **Real-world architectures** — runnable case studies (URL shortener, news feed, typeahead, chat, payments) with full design breakdowns.
- **Honest comparisons** — SQL vs NoSQL, Kafka vs RabbitMQ, PostgreSQL vs MongoDB, monolith vs microservices, REST vs gRPC vs GraphQL.

## Principles

- **Correct over impressive.** A simulation only models what it can model accurately; everything else gets a dedicated, honest visualization. Claims are checked against primary sources.
- **Learn by doing.** Every idea is something you can run, tune, and break.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · React Flow · Zustand.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
```

## Deploy

Optimised for [Vercel](https://vercel.com/new) (zero-config for Next.js). Any Node host works too.

---

© 2026 Simcademy. Crash the simulator, not production.™
