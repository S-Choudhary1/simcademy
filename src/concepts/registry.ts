import type { ComponentType } from "react";
import { CapViz } from "./CapViz";
import { AcidViz } from "./AcidViz";
import { IsolationViz } from "./IsolationViz";
import { LsmBtreeViz } from "./LsmBtreeViz";
import { BaseViz } from "./BaseViz";
import { ConsistentHashingViz } from "./ConsistentHashingViz";
import { ShardingViz } from "./ShardingViz";
import { RaftViz } from "./RaftViz";
import { CqrsViz } from "./CqrsViz";
import { EventSourcingViz } from "./EventSourcingViz";
import { CircuitBreakerViz } from "./CircuitBreakerViz";
import { RateLimitViz } from "./RateLimitViz";
import { OutboxViz } from "./OutboxViz";
import { DeliverySemanticsViz } from "./DeliverySemanticsViz";
import { RetryBackoffViz } from "./RetryBackoffViz";
import { IdempotencyViz } from "./IdempotencyViz";
import { SagaViz } from "./SagaViz";
import { TwoPhaseCommitViz } from "./TwoPhaseCommitViz";
import { LockingViz } from "./LockingViz";
import { PostgresIndexViz, MongoIndexViz } from "./IndexExplorer";
import { QueryPlanningViz } from "./QueryPlanningViz";
import { ReplicationViz } from "./ReplicationViz";
import { ConnectionPoolViz } from "./ConnectionPoolViz";

export type ConceptCategory = "Data" | "Scaling" | "Reliability" | "Coordination";

export interface ConceptSim {
  slug: string;
  name: string;
  category: ConceptCategory;
  Component: ComponentType;
}

/**
 * Registry of the correct, bespoke concept simulators. These are the SAME
 * components rendered on the concept pages — they are surfaced in the Playground
 * hub too, without ever being forced into the request-routing engine.
 */
export const CONCEPT_SIMS: ConceptSim[] = [
  { slug: "cap", name: "CAP Theorem", category: "Data", Component: CapViz },
  { slug: "acid", name: "ACID", category: "Data", Component: AcidViz },
  { slug: "isolation-levels", name: "Isolation Levels & MVCC", category: "Data", Component: IsolationViz },
  { slug: "lsm-vs-btree", name: "LSM-tree vs B-tree", category: "Data", Component: LsmBtreeViz },
  { slug: "base", name: "BASE / Eventual Consistency", category: "Data", Component: BaseViz },
  { slug: "postgresql-indexing", name: "PostgreSQL Indexing", category: "Data", Component: PostgresIndexViz },
  { slug: "mongodb-indexing", name: "MongoDB Indexing", category: "Data", Component: MongoIndexViz },
  { slug: "query-planning", name: "Query Planning & Joins", category: "Data", Component: QueryPlanningViz },
  { slug: "consistent-hashing", name: "Consistent Hashing", category: "Scaling", Component: ConsistentHashingViz },
  { slug: "sharding", name: "Sharding & Partitioning", category: "Scaling", Component: ShardingViz },
  { slug: "raft", name: "Raft Consensus", category: "Coordination", Component: RaftViz },
  { slug: "replication", name: "Replication", category: "Scaling", Component: ReplicationViz },
  { slug: "cqrs", name: "CQRS", category: "Scaling", Component: CqrsViz },
  { slug: "event-sourcing", name: "Event Sourcing", category: "Scaling", Component: EventSourcingViz },
  { slug: "circuit-breaker", name: "Circuit Breaker", category: "Reliability", Component: CircuitBreakerViz },
  { slug: "rate-limiting", name: "Rate Limiting", category: "Reliability", Component: RateLimitViz },
  { slug: "outbox", name: "Transactional Outbox", category: "Reliability", Component: OutboxViz },
  { slug: "delivery-semantics", name: "Delivery Semantics", category: "Reliability", Component: DeliverySemanticsViz },
  { slug: "retries-backoff", name: "Retries, Backoff & Jitter", category: "Reliability", Component: RetryBackoffViz },
  { slug: "idempotency", name: "Idempotency", category: "Reliability", Component: IdempotencyViz },
  { slug: "connection-pool", name: "Connection Pooling", category: "Reliability", Component: ConnectionPoolViz },
  { slug: "saga", name: "Saga", category: "Coordination", Component: SagaViz },
  { slug: "two-phase-commit", name: "Two-Phase Commit", category: "Coordination", Component: TwoPhaseCommitViz },
  { slug: "locking", name: "Locking & Concurrency", category: "Coordination", Component: LockingViz },
];

export const CONCEPT_SIM_CATEGORIES: ConceptCategory[] = ["Data", "Scaling", "Reliability", "Coordination"];
