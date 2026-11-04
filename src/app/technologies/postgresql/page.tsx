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
            Beginner → Advanced
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">PostgreSQL</h1>
        <p className="mt-2 text-slate-400">
          A relational database that handles far more reads than one machine could, by keeping extra copies (replicas) in sync with the main copy.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          PostgreSQL is a durable, <strong>ACID-compliant</strong> relational database — once it tells you a write
          succeeded, that write is safe even if the server crashes a second later. One server, the{" "}
          <strong>primary</strong>, accepts every write. It streams a record of every change (the{" "}
          <strong>WAL</strong>, short for write-ahead log) to one or more <strong>replicas</strong> — copies of the
          database that apply those same changes and can answer read queries. This is how one logical database can
          serve far more reads than a single machine could handle alone.
        </p>
      </Section>

      <Section id="problem" title="2. Why it exists">
        <p>
          Most applications read data far more often than they write it. A single server eventually can&rsquo;t keep
          up with that read volume. Replication solves it by spreading reads across several replicas, while writes
          still go through one place — the primary — so there&rsquo;s never any doubt about which copy is correct.
          The trade: a replica can be a moment behind the primary, in exchange for a lot more read capacity.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          Press <strong>Play</strong> and drag <strong>Traffic</strong> to change the request rate. At{" "}
          <strong>Beginner</strong> every request hits one database; at <strong>Intermediate</strong> a cache soaks up
          repeat reads first; at <strong>Advanced</strong> a router spreads load evenly across three database nodes
          labelled Primary/Replica 1/Replica 2. Click any node to open the Inspector and watch its live utilisation,
          or use <strong>Kill</strong> to take it down and see the router shift load to the remaining two.
        </p>
        <p>
          One honest limitation: this generic simulator treats every request the same way, so it can&rsquo;t enforce
          real PostgreSQL&rsquo;s rule that <em>only the primary accepts writes</em>{" "}
          — killing &ldquo;Primary&rdquo; here just removes a third of total capacity, the same as killing either
          replica. For the real primary-only-writes behaviour, WAL streaming, and failover, use the dedicated demo
          just below instead.
        </p>
        <TechSimulator tech="postgresql" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: streaming replication &amp; WAL</h3>
        <p>
          Every commit is appended to the primary&rsquo;s write-ahead log, advancing a counter called the{" "}
          <strong>LSN</strong> (log sequence number) that marks exactly how far into that log you are. Replicas
          stream that log and replay it; the gap between the primary&rsquo;s LSN and a replica&rsquo;s LSN is the
          replication lag. Drag <strong>Write</strong> up, switch between <strong>Async</strong> replication (fast,
          but can lag) and <strong>Sync</strong> replication (no lag on that standby, but every write waits for it),
          then click <strong>Fail primary</strong> and <strong>Promote standby</strong> to see whether any writes get
          lost.
        </p>
        <PostgresReplicationViz />
      </Section>

      <Section id="architecture" title="4. Architecture">
        <p>
          One primary, N replicas. The primary appends every change to its WAL and streams that log to each replica
          over a dedicated replication connection. Each replica replays the log to stay in sync. The application —
          or a proxy/connection pooler like PgBouncer, or a failover manager like Patroni — routes writes to the
          primary and reads to the replicas.
        </p>
      </Section>

      <Section id="lifecycle" title="5. Request Lifecycle">
        <p>
          <strong>Write:</strong> the primary applies the change, appends it to the WAL, confirms success to the
          client, then ships that WAL entry to replicas (synchronously or asynchronously, depending on configuration).{" "}
          <strong>Read:</strong> routed to a replica, which answers from whatever it has already applied — which can
          be slightly out of date if that replica is lagging.
        </p>
      </Section>

      <Section id="components" title="6. Internal Components">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>WAL (write-ahead log)</strong> — the ordered record of every change, written before the change
            is applied. It&rsquo;s how PostgreSQL recovers after a crash, and how replicas stay in sync.
          </li>
          <li>
            <strong>Streaming replication</strong> — the mechanism by which replicas continuously receive and apply
            new WAL entries as they&rsquo;re written.
          </li>
          <li>
            <strong>Replication slots &amp; sync/async modes</strong> — sync mode makes the primary wait for a
            replica to confirm before telling the client &ldquo;done&rdquo; (safer, slower); async doesn&rsquo;t wait
            (faster, riskier). Replication slots make sure the primary keeps WAL around until a replica has actually
            consumed it.
          </li>
        </ul>
      </Section>

      <Section id="scaling" title="7. Scaling">
        <p>
          Adding replicas scales <strong>reads</strong> — in the Advanced blueprint above, going from one database
          node to three directly grows total read capacity. It does <strong>not</strong> scale writes: in real
          PostgreSQL, every write still has to funnel through the one primary (the replication demo in §3 shows this
          directly — the generic traffic simulator above it can&rsquo;t). Scaling writes beyond a single machine
          requires sharding/partitioning the data instead, which is a fundamentally harder problem.
        </p>
      </Section>

      <Section id="failure" title="8. Failure Scenarios">
        <p>
          In the <strong>traffic simulator</strong> (§3): killing any one of the three database nodes — Primary or
          either replica — just removes a third of total capacity; the router sends the rest of the traffic to the
          other two. This generic engine has no concept of &ldquo;the primary,&rdquo; so it treats all three
          identically.
        </p>
        <p>
          For a real failover, use the <strong>replication demo</strong> instead: click <strong>Fail primary</strong>{" "}
          and writes stop immediately, since it really is a single point of failure for writes there. Click{" "}
          <strong>Promote standby</strong> to run the failover — the replica that was most caught-up becomes the new
          primary and writes resume, but any writes that hadn&rsquo;t replicated yet are reported as lost.
        </p>
      </Section>

      <Section id="metrics" title="9. Metrics">
        <p>
          <strong>Replication lag</strong> is the number to watch. It tells you how far behind the primary a replica
          is, and therefore how stale a read from that replica could be. Lag grows whenever the write rate outpaces
          how fast a replica can apply incoming WAL — the same backlog behaviour you&rsquo;d see in any queue that&rsquo;s
          filling up faster than it drains.
        </p>
      </Section>

      <Section id="tradeoffs" title="10. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Read scaling vs. consistency — reads from a replica can be stale (eventual consistency), not guaranteed to reflect the very latest write.</li>
          <li>Async replication is fast but can lose the most recent writes if the primary fails before they reach a replica; sync replication avoids that loss but is slower.</li>
          <li>Writes stay bottlenecked on a single primary until you shard the data across multiple primaries.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="11. Comparisons">
        <p>
          See{" "}
          <Link href="/comparisons/postgresql-vs-mongodb" className="text-sky-400 hover:text-sky-300">
            PostgreSQL vs MongoDB
          </Link>
          : both scale reads with replicas, but they differ sharply in data model, transaction guarantees, and how
          they scale writes.
        </p>
      </Section>

      <Section id="usage" title="12. Real-world Usage">
        <p>
          The default relational database for a huge share of modern backends — from small startups to large-scale
          systems — usually run as a managed offering (RDS, Cloud SQL, or an Aurora-compatible service) with read
          replicas and automated failover tools like Patroni or pg_auto_failover.
        </p>
      </Section>

      <Section id="related" title="13. Related Concepts">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">WAL</span>
          <Link href="/concepts/base" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Eventual Consistency</Link>
          <Link href="/concepts/raft" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Leader Election</Link>
          <Link href="/concepts/sharding" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
        </p>
      </Section>

      <Section id="interview" title="14. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Why does adding read replicas scale reads but not writes?</li>
          <li>What is replication lag, and how can it cause a read-your-writes anomaly (where a user doesn&rsquo;t see their own write right after making it)?</li>
          <li>Contrast synchronous and asynchronous replication and what each means for failover.</li>
          <li>What happens during a failover, and what can you lose?</li>
        </ol>
      </Section>

      <Section id="how-to-use" title="How to use it">
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
