import Link from "next/link";
import type { Metadata } from "next";
import { TechSimulator } from "@/sim/ui/TechSimulator";
import { PostgresReplicationViz } from "@/concepts/PostgresReplicationViz";

export const metadata: Metadata = {
  title: "PostgreSQL — Interactive Simulation",
  description:
    "Explore how PostgreSQL scales with replication: primary/replica topology, streaming replication lag, read scaling vs. the write bottleneck, and failover. Interactive, browser-based simulation.",
  keywords: [
    "PostgreSQL",
    "streaming replication",
    "read replica",
    "replication lag",
    "primary replica",
    "failover",
    "read scaling",
  ],
  alternates: { canonical: "/technologies/postgresql" },
  openGraph: {
    title: "PostgreSQL — Interactive Simulation",
    description: "Watch replication lag build, reads scale with replicas, and a standby get promoted.",
    type: "article",
  },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-800 py-8 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function PostgresPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Technologies</span> /{" "}
        <span className="text-slate-300">PostgreSQL</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">
            Technology
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            Advanced
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">PostgreSQL</h1>
        <p className="mt-2 text-slate-400">
          A relational database that scales reads with replicas kept in sync by streaming
          replication.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          PostgreSQL is a durable, ACID-compliant relational database. A single{" "}
          <strong>primary</strong> accepts all writes and streams its change log (the{" "}
          <strong>WAL</strong>) to one or more <strong>replicas</strong>, which apply those changes
          and can serve read queries. This is how a single logical database serves far more reads
          than one machine could.
        </p>
      </Section>

      <Section id="problem" title="2. Why it exists">
        <p>
          Most applications read far more than they write. A single server eventually can&rsquo;t
          keep up with read volume. Replication lets you fan reads out across replicas while keeping
          a single source of truth for writes — trading a little consistency (replicas can be
          slightly behind) for a lot of read capacity.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          Press <strong>Play</strong>. Writes (green) hit the primary and stream to replicas (amber
          WAL packets); reads (sky) fan out to replicas. Push <strong>Write rate</strong> above{" "}
          <strong>Replication throughput</strong> and the green bar on each replica shrinks — that
          gap is <strong>replication lag</strong>. Add replicas and watch read rate climb while
          write rate stays flat. Then <strong>Fail the primary</strong> and{" "}
          <strong>Promote a standby</strong>.
        </p>
        <TechSimulator tech="postgresql" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: streaming replication &amp; WAL</h3>
        <p>
          Every commit appends to the primary&rsquo;s write-ahead log (advancing the LSN); replicas stream and apply
          it, and the gap is replication lag. Switch between <strong>async</strong> (fast, laggy) and{" "}
          <strong>sync</strong> (lag-free standby, capped throughput), then fail the primary and promote a standby to
          see whether any writes are lost.
        </p>
        <PostgresReplicationViz />
      </Section>

      <Section id="architecture" title="4. Architecture">
        <p>
          One primary, N replicas. The primary appends every change to the WAL and streams it to
          replicas over a replication connection. Replicas replay the WAL to stay in sync. The
          application (or a proxy like PgBouncer/Patroni) routes writes to the primary and reads to
          replicas.
        </p>
      </Section>

      <Section id="lifecycle" title="5. Request Lifecycle">
        <p>
          Write: the primary applies the change, appends it to the WAL, acknowledges the client,
          and asynchronously ships the WAL to replicas. Read: routed to a replica, which answers
          from its applied state — which may be slightly behind the primary if it is lagging.
        </p>
      </Section>

      <Section id="components" title="6. Internal Components">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>WAL (Write-Ahead Log)</strong> — the ordered stream of changes; the basis of
            both crash recovery and replication.
          </li>
          <li>
            <strong>Streaming replication</strong> — replicas pull/receive WAL and apply it
            continuously.
          </li>
          <li>
            <strong>Replication slots &amp; sync/async modes</strong> — control durability vs.
            latency of replication.
          </li>
        </ul>
      </Section>

      <Section id="scaling" title="7. Scaling">
        <p>
          Adding replicas scales <strong>reads</strong> — in the simulation, read rate climbs with
          each replica. It does <strong>not</strong> scale writes: every write still funnels through
          the one primary. Scaling writes requires sharding/partitioning, a fundamentally harder
          problem.
        </p>
      </Section>

      <Section id="failure" title="8. Failure Scenarios">
        <p>
          <strong>Fail a replica</strong>: read capacity drops. <strong>Fail the primary</strong>:
          all writes stop — the primary is a write single-point-of-failure. Click{" "}
          <strong>Promote a standby</strong> to run a failover: the most caught-up replica becomes
          the new primary and writes resume — but you have one fewer read replica until you add
          another.
        </p>
      </Section>

      <Section id="metrics" title="9. Metrics">
        <p>
          <strong>Replication lag</strong> is the number to watch: it is how far behind the primary
          a replica is, and therefore how stale a read from it can be. Lag grows whenever the write
          rate exceeds a replica&rsquo;s replication throughput — the same queueing behaviour as a
          message backlog.
        </p>
      </Section>

      <Section id="tradeoffs" title="10. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Read scaling vs. consistency — replica reads can be stale (eventual consistency).</li>
          <li>Async replication is fast but can lose recent writes on failover; sync is safe but slower.</li>
          <li>Writes remain bottlenecked on a single primary until you shard.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="11. Comparisons">
        <p>
          See <span className="text-slate-400">PostgreSQL vs MongoDB</span> (coming soon): both
          scale reads with replicas; they differ sharply in data model, transactions, and how they
          shard writes.
        </p>
      </Section>

      <Section id="usage" title="12. Real-world Usage">
        <p>
          The default relational database for a huge share of modern backends — from startups to
          large-scale systems using managed offerings (RDS, Cloud SQL, Aurora-compatible) with read
          replicas and automated failover (Patroni, pg_auto_failover).
        </p>
      </Section>

      <Section id="related" title="13. Related Concepts">
        <p className="flex flex-wrap gap-2">
          {["ACID", "WAL", "Eventual Consistency", "Leader Election", "Sharding"].map((c) => (
            <span key={c} className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">
              {c}
            </span>
          ))}
        </p>
      </Section>

      <Section id="interview" title="14. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Why does adding read replicas scale reads but not writes?</li>
          <li>What is replication lag, and how can it cause a read-your-writes anomaly?</li>
          <li>Contrast synchronous and asynchronous replication and their failover implications.</li>
          <li>What happens during a failover, and what can you lose?</li>
        </ol>
      </Section>

      <Section id="usage" title="How to use it">
        <p>Wrap writes in transactions, split reads to replicas, and pool your connections:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`-- correctness: a transaction is atomic
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
  UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;

-- scale reads: SELECTs → streaming replica, writes → primary
-- pool connections with PgBouncer (transaction mode)
-- index for your query shapes and verify with EXPLAIN ANALYZE`}
        </pre>
      </Section>

      <Section id="references" title="15. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>PostgreSQL documentation — High Availability, Load Balancing, and Replication</li>
          <li>PostgreSQL WAL internals — postgresql.org/docs/current/wal-intro.html</li>
        </ul>
      </Section>
    </main>
  );
}
