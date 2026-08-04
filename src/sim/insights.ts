import { componentDef } from "./registry";
import type { SimSnapshot } from "./engine";

/* ================================================================== *
 * Live narration — turns an engine snapshot into plain-English
 * explanations of what's happening and, for problems, how to fix it.
 * Pure function; the UI renders whatever it returns each tick.
 * ================================================================== */

export type Severity = "critical" | "warn" | "info";

export interface Insight {
  key: string; // stable id (per node/condition) for React keys
  severity: Severity;
  icon: string;
  title: string; // what's happening
  reason: string; // why it's happening
  fix?: string; // how to fix it (omitted for healthy/info)
}

/** How to relieve a saturated node, tailored to what the node does. */
function scaleFix(behavior: string): string {
  switch (behavior) {
    case "datastore":
      return "add read replicas or a cache in front; shard if writes are the limit";
    case "cache":
      return "raise its capacity, or add cache nodes";
    case "router":
      return "scale it out — increase its replicas (pods)";
    case "queue":
      return "add consumers or partitions, or speed up the consumer";
    case "limiter":
      return "raise the limit, or shed load further upstream";
    case "source":
      return "lower the incoming request rate";
    default:
      return "add servers or replicas, or put a cache in front to cut its load";
  }
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, warn: 1, info: 2 };

export function analyze(s: SimSnapshot): Insight[] {
  const out: Insight[] = [];
  const m = s.metrics;

  // --- global signals ---
  if (m.errorRate >= 0.02) {
    const crit = m.errorRate >= 0.2;
    out.push({
      key: "g-errors",
      severity: crit ? "critical" : "warn",
      icon: "🔴",
      title: `${Math.round(m.errorRate * 100)}% of requests are failing`,
      reason: "requests are being dropped or erroring on a node downstream, and those failures bubble back to the client",
      fix: "find the DOWN or overloaded node flagged below and scale or heal it",
    });
  }
  if (m.throughput > 0 && m.p99 >= 500) {
    const crit = m.p99 >= 1500;
    out.push({
      key: "g-p99",
      severity: crit ? "warn" : "info",
      icon: "🐢",
      title: `Tail latency is high (p99 = ${m.p99}ms)`,
      reason: "the slowest requests are waiting in a queue behind a busy node while the fast ones sail through",
      fix: "reduce the load or scale the bottleneck so the queue drains",
    });
  }

  // --- per-node signals ---
  for (const n of s.nodes) {
    const util = Math.round(n.utilization * 100);
    const behavior = componentDef(n.type)?.behavior ?? "service";

    if (n.status === "failed") {
      out.push({
        key: `down-${n.id}`,
        severity: "critical",
        icon: "💥",
        title: `${n.label} is DOWN`,
        reason: "calls to it fail immediately, and those errors cascade up to whatever depends on it",
        fix: "recover it (select the node → Recover), or add a replica / fallback so one instance failing isn't fatal",
      });
      continue;
    }
    if (n.status === "partitioned") {
      out.push({
        key: `part-${n.id}`,
        severity: "critical",
        icon: "🔌",
        title: `${n.label} is network-partitioned`,
        reason: "a share of requests to it are silently lost, which shows up as errors and retries",
        fix: "heal the partition, or add retries plus a second replica in another zone",
      });
      continue;
    }
    if (n.status === "flaky") {
      out.push({
        key: `flaky-${n.id}`,
        severity: "warn",
        icon: "⚡",
        title: `${n.label} is flaky`,
        reason: "it's dropping roughly a quarter of requests intermittently — the hardest kind of failure to spot, because it half-works",
        fix: "add retries with backoff on the caller, a circuit breaker to fail fast when it degrades, and health checks to pull it from rotation",
      });
      continue;
    }
    if (n.status === "slow") {
      out.push({
        key: `slow-${n.id}`,
        severity: "warn",
        icon: "🐌",
        title: `${n.label} is running slow`,
        reason: "injected latency means every call through it takes longer, which inflates p95 and p99",
        fix: "recover it, or route around it with a healthy replica",
      });
      continue;
    }

    if (n.bottleneck) {
      out.push({
        key: `bottle-${n.id}`,
        severity: "warn",
        icon: "⚑",
        title: `${n.label} is the bottleneck (${util}% busy)`,
        reason: "it's the busiest node, so everything upstream queues behind it — it caps the whole system's throughput",
        fix: scaleFix(behavior),
      });
    } else if (n.utilization >= 0.9) {
      out.push({
        key: `sat-${n.id}`,
        severity: "warn",
        icon: "🔥",
        title: `${n.label} is saturated (${util}%)`,
        reason: "past ~85% utilisation, queueing latency climbs sharply — a small traffic bump will tip it over",
        fix: scaleFix(behavior),
      });
    }

    if (behavior === "queue" && n.backlog >= 100) {
      const crit = n.backlog >= 500;
      out.push({
        key: `lag-${n.id}`,
        severity: crit ? "critical" : "warn",
        icon: "📈",
        title: `${n.label} has ${n.backlog.toLocaleString()} messages of lag`,
        reason: "producers are putting messages in faster than consumers take them out, so the backlog piles up",
        fix: "add consumers or partitions, or make the consumer faster",
      });
    }

    if (n.dropped > 0 && (behavior === "limiter" || behavior === "queue" || n.utilization >= 0.98)) {
      out.push({
        key: `drop-${n.id}`,
        severity: "warn",
        icon: "🚫",
        title: `${n.label} has dropped ${n.dropped.toLocaleString()} requests`,
        reason:
          behavior === "limiter"
            ? "requests came in over the rate limit and were rejected"
            : "its queue filled up, so it shed the overflow (backpressure)",
        fix:
          behavior === "limiter"
            ? "raise the limit, or slow the callers down"
            : "add capacity, or put a rate limiter upstream so overload fails fast instead of piling up",
      });
    }
  }

  out.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  if (out.length === 0 && s.running && m.throughput > 0) {
    out.push({
      key: "healthy",
      severity: "info",
      icon: "✅",
      title: `System healthy — ${m.throughput} rps, p99 ${m.p99}ms`,
      reason: "no bottleneck and no errors: every node is comfortably keeping up with the load",
    });
  }

  return out;
}
