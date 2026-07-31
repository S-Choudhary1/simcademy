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
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">Intermediate</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">MongoDB</h1>
        <p className="mt-2 text-slate-400">
          A document database that scales horizontally by sharding data across many nodes.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          MongoDB stores flexible JSON-like <strong>documents</strong> instead of rows in fixed tables. It scales
          reads with replica sets and — crucially — scales <em>writes</em> by <strong>sharding</strong>: splitting a
          collection across many nodes, each owning a slice of the key space.
        </p>
      </Section>

      <Section id="why" title="2. Why it exists">
        <p>
          When data and write volume outgrow a single machine, you must partition. MongoDB builds sharding in: a
          router (<code>mongos</code>) sends each document to the shard that owns its shard-key range, so the cluster&rsquo;s
          write capacity grows with the number of shards.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          Start at <strong>Beginner</strong> (one node), add a cache at <strong>Intermediate</strong>, then jump to{" "}
          <strong>Advanced</strong> to watch a <code>mongos</code> router spread load across three shards. Push the
          traffic up and notice no single shard becomes the bottleneck.
        </p>
        <TechSimulator tech="mongodb" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: sharding &amp; the shard key</h3>
        <p>
          How the shard key decides data distribution and query routing. Pick a key, insert documents, and watch them
          spread evenly (hashed) or pile onto one hot shard (low-cardinality or monotonic). Then run a targeted vs a
          scatter-gather query.
        </p>
        <MongoShardingViz />
      </Section>

      <Section id="scaling" title="4. Scaling">
        <p>
          Replica sets scale reads and provide failover; sharding scales writes and storage. Choosing a good{" "}
          <strong>shard key</strong> (high cardinality, even access) is the whole game — a bad key creates a hot shard
          that behaves like the single-node bottleneck you were trying to escape.
        </p>
      </Section>

      <Section id="failure" title="5. Failure Scenarios">
        <p>
          Kill a shard in the Advanced simulation: the requests routed to it error while the others keep serving. In
          production a replica within that shard is elected primary to recover. A hot shard (skewed shard key) shows up
          as one node at high utilisation while the rest idle.
        </p>
      </Section>

      <Section id="metrics" title="6. Metrics">
        <p>
          Watch per-shard utilisation and overall p95/p99. Even load across shards means a good shard key; a single
          saturated shard means a hot key or poor distribution.
        </p>
      </Section>

      <Section id="tradeoffs" title="7. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Flexible schema speeds iteration but pushes validation into the app.</li>
          <li>Cross-shard queries and transactions are expensive; design to keep operations single-shard.</li>
          <li>Shard-key choice is hard to change later.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="8. Comparisons">
        <p>
          See <span className="text-slate-400">PostgreSQL vs MongoDB</span> (coming soon): relational + strong
          transactions vs. document model + built-in sharding.
        </p>
      </Section>

      <Section id="usage" title="9. Real-world Usage">
        <p>Content platforms, catalogs, user profiles, IoT/event data, and anything with evolving, denormalised documents.</p>
      </Section>

      <Section id="interview" title="10. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>What makes a good shard key, and what happens with a bad one?</li>
          <li>How does sharding scale writes when replicas only scale reads?</li>
          <li>Why are cross-shard transactions discouraged?</li>
        </ol>
      </Section>

      <Section id="usage" title="How to use it">
        <p>Model documents around your reads, then enable sharding for write scale:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// embed data you read together; reference data that changes on its own
db.orders.insertOne({ _id, userId, items: [ ... ], total })

// a replica set gives failover; sharding scales writes
sh.enableSharding("shop")
sh.shardCollection("shop.orders", { userId: "hashed" })`}
        </pre>
        <p>Pick a shard key with high cardinality and even access, and design operations to hit a single shard.</p>
      </Section>

      <Section id="references" title="11. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>MongoDB documentation — Sharding</li>
          <li>MongoDB Replica Sets and Elections</li>
        </ul>
      </Section>
    </main>
  );
}
