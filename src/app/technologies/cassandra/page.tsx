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
          A database with no single leader, built to absorb huge write volume and keep running even if a node or an
          entire datacenter goes down — used for write-heavy workloads at Netflix, Apple, and Discord.
        </p>
      </header>

      <Section title="1. What it is">
        <p>
          Cassandra is a <strong>distributed wide-column database</strong> — picture a table where every row can have
          its own set of columns, spread across many machines by design.
        </p>
        <p>
          It&rsquo;s <strong>masterless</strong>{" "}(also called peer-to-peer): every node is equal, there&rsquo;s no
          single leader that could fail, and a client can send a write to any node in the cluster.
        </p>
        <p>
          Data is spread across the cluster using{" "}
          <Link href="/concepts/consistent-hashing" className="text-sky-400 hover:text-sky-300">consistent hashing</Link>{" "}
          (with virtual nodes to spread the load more evenly) — each row lands on whichever node owns that part of the
          hash space, and is copied to <strong>RF</strong>{" "}(replication factor) nodes total, not just one, so losing a
          single node never loses data.
        </p>
        <p>
          Storage is built on an{" "}
          <Link href="/concepts/lsm-vs-btree" className="text-sky-400 hover:text-sky-300">LSM-tree</Link>{" "}(log-structured
          merge-tree) — a structure optimised to make writes extremely cheap, which is the main reason Cassandra can
          absorb so much write traffic.
        </p>
      </Section>

      <Section title="2. Tunable consistency (its signature)">
        <p>
          Cassandra doesn&rsquo;t force one consistency level on every query — you choose, per query, how many
          replicas must respond before it counts as done: <code>ONE</code>, <code>QUORUM</code>{" "}(a majority), or{" "}
          <code>ALL</code>. You set this separately for reads (<strong>R</strong>) and writes (<strong>W</strong>).
        </p>
        <p>
          The rule that matters: when <strong>R + W &gt; N</strong>{" "}(N being the total number of replicas), the set of
          replicas you read from and the set you wrote to are guaranteed to overlap by at least one node — so a read
          is guaranteed to see the latest write. That&rsquo;s strong consistency. Pick R and W so they don&rsquo;t
          overlap, and reads can come back stale (eventual consistency) — but faster, since fewer replicas need to
          respond. Try it:
        </p>
        <CassandraQuorumViz />
      </Section>

      <Section title="3. How a write works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>The client sends the write to any node. That node becomes the <strong>coordinator</strong>{" "}for this one request and forwards it to the RF replicas that actually own the row.</li>
          <li>Each replica writes it twice, fast: first to a <strong>commit log</strong>{" "}on disk (so it survives a crash), then into an in-memory table called a <strong>memtable</strong>.</li>
          <li>Later, a full memtable gets flushed to disk as an immutable file called an <strong>SSTable</strong>. Nothing is ever edited in place — everything is just appended — which is exactly why writes are so cheap.</li>
          <li>A background process called <strong>compaction</strong>{" "}periodically merges old SSTables together and throws away data that&rsquo;s been overwritten or deleted.</li>
          <li>If a replica missed the write (it was down, say), Cassandra catches it up later via <strong>hinted handoff</strong>, <strong>read repair</strong>, and <strong>anti-entropy</strong> — three different mechanisms aimed at the same goal: every replica eventually agreeing.</li>
        </ol>
      </Section>

      <Section title="4. Data modelling — query first">
        <p>
          Cassandra has <strong>no joins and no ad-hoc queries</strong> — you design each table around one specific
          query you need to run fast, not around the data&rsquo;s natural shape. The <strong>partition key</strong>{" "}
          decides which node owns a row; the <strong>clustering columns</strong>{" "}decide the order rows are stored in
          within that partition. It&rsquo;s normal — even expected — to duplicate the same data across several
          tables shaped for different queries, since storage is cheap and every query needs to hit a single partition
          to stay fast.
        </p>
      </Section>

      <Section title="5. When to use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>Write-heavy workloads: time-series data, event logs, metrics, messaging, activity feeds.</li>
          <li>Always-on services that need to survive losing a node — or a whole datacenter — without a manual failover step.</li>
          <li>Access patterns you already know in advance — not exploratory analytics or queries with complex joins.</li>
        </ul>
      </Section>

      <Section title="6. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>No joins, no referential integrity, and only limited transaction support (lightweight transactions use Paxos for compare-and-set — correct, but noticeably slower than a normal write).</li>
          <li>Eventually consistent by default — you have to deliberately choose your R/W consistency levels to guarantee reading your own writes.</li>
          <li>A bad data model (oversized or unevenly hot partitions) hurts badly, and the schema is dictated by your queries up front — hard to change later.</li>
          <li>Compaction and repair are real, ongoing operational work, not a one-time setup cost.</li>
        </ul>
      </Section>

      <Section title="How to use it">
        <p>Model a table around the one query it needs to serve, and tune consistency per query with CQL (Cassandra Query Language):</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`CREATE KEYSPACE shop
  WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3};

CREATE TABLE shop.orders_by_user (
  user_id   uuid,
  order_id  timeuuid,
  total     decimal,
  PRIMARY KEY (user_id, order_id)   -- user_id = partition key, order_id = clustering column
) WITH CLUSTERING ORDER BY (order_id DESC);

CONSISTENCY QUORUM;                 -- require a majority of RF replicas to agree
SELECT * FROM shop.orders_by_user WHERE user_id = ?;`}
        </pre>
        <p>
          The partition key (<code>user_id</code>) decides which node owns the data; the clustering column (
          <code>order_id</code>) decides the on-disk order within that partition — so &ldquo;latest orders for this
          user&rdquo; is a single, fast, single-partition read.
        </p>
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
