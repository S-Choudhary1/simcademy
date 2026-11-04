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
          Picture a circle, like a clock face, running from 0 all the way around back to 0. Every node (server) and
          every key gets a position on that circle, decided by running each one through the same hash function. A key
          belongs to whichever node is the first one you hit going clockwise from the key&rsquo;s position.
        </p>
        <p>
          Because a position never changes unless the hash input changes, a key reliably lands on the same node every
          time. And when the set of nodes changes, only the keys sitting in the affected slice of the circle need to
          move — not the whole dataset.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          The naive approach is <code>node = hash(key) % N</code>, where <code>N</code>{" "}is the number of nodes. The
          problem: the moment <code>N</code>{" "}changes — a node is added or removed — almost every key&rsquo;s answer to
          that formula changes too, even though most nodes never moved. For a cache, that means the entire cache goes
          cold at once. Consistent hashing keeps the circle mostly unchanged when a node joins or leaves, so only
          about 1-in-<code>N</code>{" "}keys ever need to move.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Each dot is a key, coloured by the node that currently owns it. Add or remove a node and watch the counter:
          consistent hashing only reassigns the keys in one slice of the circle, while plain modulo hashing would
          reshuffle almost everything.
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
          Distributed caches (client-side hashing for Memcached), and the way data is split up inside Amazon&rsquo;s
          Dynamo, Cassandra, and Riak. Real systems add <strong>virtual nodes</strong> — placing each physical node at
          many positions around the circle — so load stays even and rebalancing is smoother.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Hash both nodes and keys onto the same circle — in practice a number line from 0 to 2³² (or larger) rather than literal degrees — using a well-distributed hash function like xxHash or MD5.</li>
          <li>Keep the node positions in a sorted list; to find a key&rsquo;s node, binary-search for the next position clockwise.</li>
          <li>Add <strong>virtual nodes</strong> — 100 to 200 positions per physical node is typical — so load stays even and rebalancing doesn&rsquo;t dump everything onto one neighbour.</li>
          <li>To replicate data, keep walking clockwise to the next N distinct physical nodes.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Moves very few keys when the node list changes, but without virtual nodes the load can be uneven — one node can get unlucky and own a much bigger slice of the circle than the others.</li>
          <li>Virtual nodes fix the balance problem, but cost extra memory and a bit more lookup work.</li>
          <li>Consistent hashing only solves placement — you still need a separate strategy for replication and consistency on top of it.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Skipping virtual nodes — a single physical node can randomly end up owning a disproportionate slice of the circle.</li>
          <li>Using a weak or poorly-distributed hash function, which clusters keys together instead of spreading them evenly.</li>
          <li>Treating the ring as the whole solution — placement is solved, but replication and consistency still need their own design.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/sharding" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
          <Link href="/technologies/redis" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Redis</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Load Balancing</span>
        </p>
      </Section>
    </main>
  );
}
