/**
 * Central catalogue of pages for navigation and index pages. One source of
 * truth so the header, homepage, and section indexes never drift.
 */

export interface CatalogItem {
  slug: string;
  name: string;
  blurb: string;
}

export const TECHNOLOGIES: CatalogItem[] = [
  { slug: "kafka", name: "Apache Kafka", blurb: "Distributed, partitioned commit log for high-throughput event streaming." },
  { slug: "redis", name: "Redis", blurb: "In-memory store, most often a cache in front of a slower database." },
  { slug: "postgresql", name: "PostgreSQL", blurb: "Relational database that scales reads with replicas." },
  { slug: "mongodb", name: "MongoDB", blurb: "Document database that shards for horizontal write scale." },
  { slug: "rabbitmq", name: "RabbitMQ", blurb: "Message broker for work queues and flexible routing." },
  { slug: "nginx", name: "Nginx", blurb: "Reverse proxy and load balancer that fronts your app servers." },
  { slug: "cassandra", name: "Apache Cassandra", blurb: "Masterless wide-column store with tunable consistency and linear write scale." },
];

export const CONCEPTS: CatalogItem[] = [
  { slug: "cap", name: "CAP Theorem", blurb: "Under a partition, choose consistency or availability — not both." },
  { slug: "acid", name: "ACID", blurb: "Atomic, consistent, isolated, durable transactions." },
  { slug: "isolation-levels", name: "Isolation Levels & MVCC", blurb: "Dirty/non-repeatable/phantom reads and how snapshots stop them." },
  { slug: "lsm-vs-btree", name: "LSM-tree vs B-tree", blurb: "Write-optimized log-structured storage vs read-optimized trees." },
  { slug: "base", name: "BASE", blurb: "Eventual consistency: available now, consistent soon." },
  { slug: "cqrs", name: "CQRS", blurb: "Separate read and write models, kept in sync by a projection." },
  { slug: "saga", name: "Saga", blurb: "Distributed transaction with compensating rollbacks." },
  { slug: "consistent-hashing", name: "Consistent Hashing", blurb: "Distribute keys so few move when nodes change." },
  { slug: "sharding", name: "Sharding & Partitioning", blurb: "Range vs hash sharding, hot shards, and resharding cost." },
  { slug: "raft", name: "Raft Consensus", blurb: "Leader election and log replication with majority commit." },
  { slug: "circuit-breaker", name: "Circuit Breaker", blurb: "Fail fast when a dependency is unhealthy, then recover." },
  { slug: "rate-limiting", name: "Rate Limiting", blurb: "Token bucket, leaky bucket, fixed and sliding window." },
  { slug: "outbox", name: "Transactional Outbox", blurb: "Reliable event publishing without the dual-write problem." },
  { slug: "delivery-semantics", name: "Delivery Semantics", blurb: "At-most / at-least / exactly-once, and why acks get lost." },
  { slug: "retries-backoff", name: "Retries, Backoff & Jitter", blurb: "Avoid the thundering herd with exponential backoff + jitter." },
  { slug: "idempotency", name: "Idempotency", blurb: "Make an operation safe to retry — doing it twice equals once." },
  { slug: "locking", name: "Locking & Concurrency", blurb: "Optimistic vs pessimistic vs distributed locks; avoid lost updates." },
  { slug: "event-sourcing", name: "Event Sourcing", blurb: "Store the log of changes; derive state by replaying it." },
  { slug: "two-phase-commit", name: "Two-Phase Commit", blurb: "Atomic commit across systems — and its blocking problem." },
  { slug: "postgresql-indexing", name: "PostgreSQL Indexing", blurb: "Real heap + B-tree on email; Index Scan vs Seq Scan." },
  { slug: "mongodb-indexing", name: "MongoDB Indexing", blurb: "10 real documents + B-tree; IXSCAN vs COLLSCAN." },
  { slug: "query-planning", name: "Query Planning & Joins", blurb: "Index types, cost-based planner, and joins — per Postgres & Mongo." },
  { slug: "replication", name: "Replication", blurb: "Leader-follower: read scaling, replication lag, and failover." },
  { slug: "connection-pool", name: "Connection Pooling", blurb: "Borrow from a fixed set of DB connections; exhaustion & timeouts." },
];

export const COMPARISONS: CatalogItem[] = [
  { slug: "sql-vs-nosql", name: "SQL vs NoSQL", blurb: "Not about scale — about your data model and how you query it." },
  { slug: "rest-vs-grpc-vs-graphql", name: "REST vs gRPC vs GraphQL", blurb: "Resources, contracts, or client-shaped queries — three API styles." },
  { slug: "monolith-vs-microservices", name: "Monolith vs Microservices", blurb: "Trade a code-complexity problem for a distributed-systems one." },
  { slug: "kafka-vs-rabbitmq", name: "Kafka vs RabbitMQ", blurb: "Replayable log vs smart routing broker." },
  { slug: "postgresql-vs-mongodb", name: "PostgreSQL vs MongoDB", blurb: "Relational + replicas vs document + sharding." },
];
