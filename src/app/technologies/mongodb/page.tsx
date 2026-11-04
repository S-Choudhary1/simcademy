import Link from "next/link";
import type { Metadata } from "next";
import { TechSimulator } from "@/sim/ui/TechSimulator";
import { MongoShardingViz } from "@/concepts/MongoShardingViz";

export const metadata: Metadata = {
  title: "MongoDB — Interactive Simulation",
  description:
    "Explore how MongoDB scales: the document model, read caching, and sharding for horizontal write scale. Interactive, browser-based simulation.",
  keywords: ["MongoDB", "document database", "sharding", "mongos", "NoSQL", "horizontal scaling"],
  alternates: { canonical: "/technologies/mongodb" },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-800 py-8 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function MongoDBPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Technologies</span> / <span className="text-slate-300">MongoDB</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">Technology</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">Beginner → Advanced</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">MongoDB</h1>
        <p className="mt-2 text-slate-400">
          A document database that scales by splitting (sharding) data across many machines instead of one.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          MongoDB stores flexible, JSON-like <strong>documents</strong> instead of rows in fixed tables — each
          document can have its own set of fields, no rigid schema required. It scales reads using{" "}
          <strong>replica sets</strong> (groups of synced copies of the same data, for redundancy and read capacity),
          and — its real differentiator — scales <em>writes</em> by <strong>sharding</strong>: splitting one
          collection of documents across many nodes, each holding its own slice of the data.
        </p>
      </Section>

      <Section id="why" title="2. Why it exists">
        <p>
          When your data and write volume outgrow what one machine can hold, you have to split (partition) it
          somehow. MongoDB builds that splitting in directly: a router process called <code>mongos</code> looks at
          each document&rsquo;s <strong>shard key</strong> and sends it to the one shard responsible for that part of
          the key range. As you add shards, the cluster&rsquo;s total write capacity grows with them.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          Start at <strong>Beginner</strong> (a single node), add a cache at <strong>Intermediate</strong>, then jump
          to <strong>Advanced</strong> to watch a <code>mongos</code> router spread load across three shards. Push the
          traffic up and notice that no single shard becomes the bottleneck.
        </p>
        <TechSimulator tech="mongodb" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: sharding &amp; the shard key</h3>
        <p>
          See how the shard key decides both where data lives and how queries get routed. Pick a key, insert
          documents, and watch them spread evenly (a <strong>hashed</strong> key) or pile onto one overloaded shard (a{" "}
          <strong>low-cardinality</strong> or <strong>monotonic</strong> key — one with too few distinct values, or
          one that always increases, like a timestamp). Then compare a <strong>targeted query</strong> (goes straight
          to the one shard that owns the data) against a <strong>scatter-gather query</strong> (has to ask every
          shard because it doesn&rsquo;t include the shard key).
        </p>
        <MongoShardingViz />
      </Section>

      <Section id="scaling" title="4. Scaling">
        <p>
          Replica sets scale reads and give you failover (a backup copy is ready to take over). Sharding scales
          writes and total storage. Picking a good <strong>shard key</strong> — one with many distinct values and
          evenly spread access — is the whole game: a bad key creates a <strong>hot shard</strong> that takes most of
          the traffic, which is exactly the single-node bottleneck you were trying to avoid.
        </p>
      </Section>

      <Section id="failure" title="5. Failure Scenarios">
        <p>
          Kill a shard in the Advanced simulation: requests routed to it fail while the other shards keep serving
          normally. In a real cluster, a replica inside that shard&rsquo;s replica set gets elected as the new primary
          to recover automatically. A hot shard — caused by a skewed shard key — shows up as one node running hot
          while the rest sit nearly idle.
        </p>
      </Section>

      <Section id="metrics" title="6. Metrics">
        <p>
          Watch per-shard utilisation alongside overall p95/p99 latency. Even load across every shard means you
          picked a good shard key; one shard saturated while the others idle means a hot key or poor data
          distribution.
        </p>
      </Section>

      <Section id="tradeoffs" title="7. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>A flexible schema speeds up iteration, but it pushes data validation into your application code instead of the database.</li>
          <li>Queries or transactions that span multiple shards are expensive — design your data model so most operations touch only one shard.</li>
          <li>Your shard-key choice is hard to change later, since it determines how every document is physically distributed.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="8. Comparisons">
        <p>
          See{" "}
          <Link href="/comparisons/postgresql-vs-mongodb" className="text-sky-400 hover:text-sky-300">
            PostgreSQL vs MongoDB
          </Link>
          : a relational database with strong transactions vs. a document model with sharding built in from day one.
        </p>
      </Section>

      <Section id="usage" title="9. Real-world Usage">
        <p>Content platforms, product catalogs, user profiles, IoT and event data, and anything with evolving, denormalised documents.</p>
      </Section>

      <Section id="related" title="10. Related Concepts">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/sharding" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
          <Link href="/concepts/replication" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Replication</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP Theorem</Link>
        </p>
      </Section>

      <Section id="interview" title="11. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>What makes a good shard key, and what goes wrong with a bad one?</li>
          <li>How does sharding scale writes when replica sets only scale reads?</li>
          <li>Why are cross-shard transactions discouraged?</li>
        </ol>
      </Section>

      <Section id="how-to-use" title="How to use it">
        <p>Model documents around how you&rsquo;ll read them, then enable sharding once you need write scale:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// embed data you read together; reference data that changes on its own
db.orders.insertOne({ _id, userId, items: [ ... ], total })

// a replica set gives failover; sharding scales writes
sh.enableSharding("shop")
sh.shardCollection("shop.orders", { userId: "hashed" })`}
        </pre>
        <p>Pick a shard key with many distinct values and evenly spread access, and design operations to hit a single shard.</p>
      </Section>

      <Section id="references" title="12. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>MongoDB documentation — Sharding</li>
          <li>MongoDB Replica Sets and Elections</li>
        </ul>
      </Section>
    </main>
  );
}
