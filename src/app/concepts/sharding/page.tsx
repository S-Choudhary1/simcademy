import Link from "next/link";
import type { Metadata } from "next";
import { ShardingViz } from "@/concepts/ShardingViz";

export const metadata: Metadata = {
  title: "Sharding & Partitioning — Interactive Concept",
  description:
    "How a keyspace is split across shards: range sharding (contiguous ranges, cheap range scans, but hot shards on sequential keys) vs hash sharding (even load, no range scans, and mass key movement on resharding). Interactive visualization.",
  keywords: ["sharding", "partitioning", "range sharding", "hash sharding", "hot shard", "resharding", "consistent hashing", "horizontal scaling", "shard key"],
  alternates: { canonical: "/concepts/sharding" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function ShardingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Sharding &amp; Partitioning</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Sharding &amp; Partitioning</h1>
        <p className="mt-2 text-slate-400">
          One machine can&rsquo;t hold everything, so you split the data across many. <em>How</em>{" "}you split it decides
          whether load stays even — and what a resharding costs.
        </p>
      </header>

      <Section title="Definition">
        <p>
          <strong>Sharding</strong> — also called horizontal partitioning — splits one big dataset across several
          independent machines, called <strong>shards</strong>, using a <strong>shard key</strong>{" "}to decide which
          shard each row or document belongs to. Each shard only has to handle its own slice of the data, so total
          capacity grows as you add more shards.
        </p>
        <p>
          How you pick the shard key changes everything. The two most common approaches are{" "}
          <strong>range</strong>{" "}and <strong>hash</strong>, and they fail in very different ways.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Switch between <strong>range</strong>{" "}and <strong>hash</strong>{" "}sharding, and between <strong>spread-out</strong>{" "}
          and <strong>sequential</strong>{" "}keys. Watch how evenly the load lands on each shard, then press{" "}
          <strong>+ Shard</strong>{" "}and see how many keys actually have to move.
        </p>
        <ShardingViz />
      </Section>

      <Section title="Range vs hash">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Range</strong>{" "}keeps keys in order, so a range query (<code>BETWEEN</code>, &ldquo;last 7 days&rdquo;) only has to touch a few shards. The catch: keys that increase in a predictable way — auto-increment IDs, timestamps — all land in the newest range, piling all the write traffic onto one <strong>hot shard</strong>.</li>
          <li><strong>Hash</strong>{" "}spreads keys out evenly no matter what the workload looks like, so there&rsquo;s no hot shard. The cost: you lose ordered range scans, and a naive <code>hash(key) % N</code>{" "}reshuffles almost every key the moment <code>N</code>{" "}changes.</li>
        </ul>
      </Section>

      <Section title="The resharding problem">
        <p>
          With plain modulo hashing, adding just one shard changes <code>hash(key) % N</code>{" "}for nearly every key —
          only about 1-in-<code>N</code>{" "}keys happen to land on the same shard by coincidence, so almost the entire
          dataset has to move at once.{" "}
          <Link href="/concepts/consistent-hashing" className="text-sky-400 hover:text-sky-300">Consistent hashing</Link>{" "}
          fixes exactly this: adding or removing a shard only moves about 1/N of the keys, not nearly all of them.
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          A library with one giant shelf that got too full, so the books get split across several rooms. Sort by
          title (range sharding) and &ldquo;find all books starting with S&rdquo; is fast — but a flood of new books
          on a trending topic that all happen to start with the same letter piles onto one room. Sort by a scrambled
          code stamped inside the cover (hash sharding) and books land evenly across every room — but now
          &ldquo;find all books starting with S&rdquo; means checking every single room.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Any system with more data or traffic than one machine can comfortably hold:{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link>{" "}and Cassandra
          shard natively, as do large-scale SQL deployments using tools like Vitess (for MySQL) or Citus (for
          PostgreSQL), and plenty of systems that manually split data by customer ID or region.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Pick a shard key that spreads both storage and traffic evenly — usually something high-cardinality like a user ID, not a low-cardinality field like country or status.</li>
          <li>Choose range vs hash based on your query patterns: lean range if you need frequent range scans (and avoid a monotonically increasing key); lean hash if you mostly do point lookups and want to avoid hot shards.</li>
          <li>Design the application so most queries can be routed to a single shard using the shard key — a routing layer (like MongoDB&rsquo;s <code>mongos</code>) directs each query to the right shard(s).</li>
          <li>Plan for resharding from day one: either lean on consistent hashing so adding a shard is cheap, or pick a shard count you&rsquo;re confident will last.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Scaling storage and throughput by adding machines vs real operational cost: cross-shard queries, joins, and transactions get slow or impossible, and resharding can mean a major data migration.</li>
          <li>The shard key choice is make-or-break — pick wrong and you can end up with one overloaded shard no matter how many shards you add.</li>
          <li>Sharding solves a capacity problem, not a correctness problem — it&rsquo;s worth the added complexity once a single, well-tuned machine genuinely can&rsquo;t keep up, not before.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>A low-cardinality shard key (e.g. country) — a few shards get everything.</li>
          <li>A monotonic shard key on a write-heavy table → a permanent hot shard.</li>
          <li>Cross-shard joins and transactions — they defeat the point of sharding; design so most queries hit one shard.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/consistent-hashing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Consistent Hashing</Link>
          <Link href="/concepts/replication" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Replication</Link>
          <Link href="/technologies/mongodb" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">MongoDB</Link>
        </p>
      </Section>
    </main>
  );
}
