import Link from "next/link";
import type { Metadata } from "next";
import { ConsistentHashingViz } from "@/concepts/ConsistentHashingViz";

export const metadata: Metadata = {
  title: "Consistent Hashing — Interactive Concept",
  description:
    "Consistent hashing explained with an interactive hash ring: add or remove nodes and see that only a small slice of keys move — versus modulo hashing, which reshuffles almost everything.",
  keywords: ["consistent hashing", "hash ring", "sharding", "distributed cache", "rebalancing", "virtual nodes"],
  alternates: { canonical: "/concepts/consistent-hashing" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function ConsistentHashingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Consistent Hashing</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Consistent Hashing</h1>
        <p className="mt-2 text-slate-400">
          Distribute keys across nodes so that adding or removing a node moves as few keys as possible.
        </p>
      </header>

      <Section title="Definition">
        <p>
          Place both nodes and keys on a circular hash ring (0–360°). Each key is owned by the first node clockwise
          from it. Because positions are fixed by a hash, a key deterministically lands on one node — and when the set
          of nodes changes, only the keys in the affected arc are reassigned.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          The naive approach — <code>node = hash(key) % N</code> — breaks the instant <code>N</code> changes: almost
          every key maps to a different node, so adding one cache server can invalidate the whole cache at once. Consistent
          hashing keeps the mapping stable, moving only ~1/N of the keys when a node joins or leaves.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Each dot is a key, coloured by the node that owns it. Add or remove a node and read the counter: consistent
          hashing moves only the keys in one arc, while modulo hashing would reshuffle almost all of them.
        </p>
        <ConsistentHashingViz />
      </Section>

      <Section title="Analogy">
        <p>
          A clock face where guests (keys) are served by the next host (node) clockwise. If one host leaves, only the
          guests in that host&rsquo;s slice go to the next host — everyone else keeps the same host. You don&rsquo;t
          re-seat the entire room.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Distributed caches (Memcached client rings), and the partitioning of Amazon Dynamo, Cassandra, and Riak.
          Production systems add <strong>virtual nodes</strong> (each physical node placed at many ring positions) so
          load stays even and rebalancing is smoother.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Hash nodes and keys onto a ring (0 … 2³²) with a good hash (e.g. xxHash / MD5).</li>
          <li>Keep node positions in a sorted structure; for a key, binary-search the next position clockwise.</li>
          <li>Add <strong>virtual nodes</strong> — 100–200 ring positions per physical node — so load stays even and rebalancing is smooth.</li>
          <li>Replicate by walking to the next N distinct nodes on the ring.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Minimal reshuffle on membership change vs uneven load without virtual nodes.</li>
          <li>Virtual nodes fix balance but cost extra memory and lookup work.</li>
          <li>Still needs a replication and consistency strategy layered on top of placement.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>No virtual nodes → uneven load; one node can own a huge arc by chance.</li>
          <li>A weak hash function → clustering and hotspots.</li>
          <li>Forgetting that replication/placement still needs care on top of the ring.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/technologies/mongodb" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
          <Link href="/technologies/redis" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Redis</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Load Balancing</span>
        </p>
      </Section>
    </main>
  );
}
