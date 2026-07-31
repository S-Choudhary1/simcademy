import Link from "next/link";
import type { Metadata } from "next";
import { CassandraQuorumViz } from "@/concepts/CassandraQuorumViz";

export const metadata: Metadata = {
  title: "Apache Cassandra — Interactive Guide",
  description:
    "How Apache Cassandra works: a masterless (peer-to-peer) wide-column store built on a consistent-hashing ring, with tunable per-query consistency (R + W > N), LSM-tree storage, and linear write scalability. Interactive quorum visualization.",
  keywords: ["Apache Cassandra", "wide-column", "tunable consistency", "quorum", "R + W > N", "consistent hashing", "LSM-tree", "masterless", "NoSQL", "linear scalability", "CQL"],
  alternates: { canonical: "/technologies/cassandra" },
};

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function CassandraPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Technologies</span> / <span className="text-slate-300">Apache Cassandra</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">Technology</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Apache Cassandra</h1>
        <p className="mt-2 text-slate-400">
          A masterless, wide-column store designed for enormous write throughput and no single point of failure — the
          database behind write-heavy workloads at Netflix, Apple, and Discord.
        </p>
      </header>

      <Section title="1. What it is">
        <p>
          Cassandra is a <strong>distributed wide-column database</strong> with a <strong>masterless</strong>{" "}
          (peer-to-peer) design: every node is equal, so there&rsquo;s no leader to fail and writes can hit any node. It
          spreads data across a <Link href="/concepts/consistent-hashing" className="text-sky-400 hover:text-sky-300">consistent-hashing</Link>{" "}
          ring (using virtual nodes), replicates each row to <strong>RF</strong> nodes, and lets you tune consistency{" "}
          <em>per query</em>. Storage is an <Link href="/concepts/lsm-vs-btree" className="text-sky-400 hover:text-sky-300">LSM-tree</Link>,
          which is why writes are so cheap.
        </p>
      </Section>

      <Section title="2. Tunable consistency (its signature)">
        <p>
          Cassandra doesn&rsquo;t force one consistency level on you. Each query picks how many replicas must respond —
          <code> ONE</code>, <code>QUORUM</code>, <code>ALL</code> — for reads (R) and writes (W) independently. The rule
          that matters: when <strong>R + W &gt; N</strong>, the read and write quorums overlap, so a read is guaranteed to
          see the latest write (strong consistency). Below that, reads can be stale (eventual). Try it:
        </p>
        <CassandraQuorumViz />
      </Section>

      <Section title="3. How a write works">
        <p>
          A write goes to a <strong>coordinator</strong> (any node), which forwards it to the RF replicas. Each replica
          appends to its <strong>commit log</strong> and an in-memory <strong>memtable</strong>, which later flushes to an
          immutable <strong>SSTable</strong>; background <strong>compaction</strong> merges SSTables. Because every write
          is a sequential append — never an in-place update — Cassandra absorbs huge write volume. Missed replicas are
          repaired later via <strong>hinted handoff</strong>, <strong>read repair</strong>, and anti-entropy.
        </p>
      </Section>

      <Section title="4. Data modelling — query first">
        <p>
          Cassandra has <strong>no joins and no ad-hoc queries</strong>. You model tables around the exact queries you
          need: a <strong>partition key</strong> decides which node owns the row, and <strong>clustering columns</strong>{" "}
          sort rows within a partition. Denormalize freely and duplicate data across tables — storage is cheap, and each
          query must hit a single partition to stay fast.
        </p>
      </Section>

      <Section title="5. When to use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>Write-heavy workloads: time-series, event logs, metrics, messaging, feeds.</li>
          <li>Always-on services that need to survive a node or datacenter loss with no failover step.</li>
          <li>Predictable, query-driven access patterns — not exploratory analytics or complex joins.</li>
        </ul>
      </Section>

      <Section title="6. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>No joins, no referential integrity, and only limited transactions (lightweight transactions use Paxos for compare-and-set — and they&rsquo;re slow).</li>
          <li>Eventual consistency by default; you must reason about R/W/N to get read-your-writes.</li>
          <li>Bad data models (large or hot partitions) hurt badly — the schema is dictated by queries, decided up front.</li>
          <li>Compaction and repair are real operational overhead.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/consistent-hashing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Consistent Hashing</Link>
          <Link href="/concepts/sharding" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
          <Link href="/concepts/lsm-vs-btree" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">LSM-tree vs B-tree</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP Theorem</Link>
        </p>
      </Section>
    </main>
  );
}
