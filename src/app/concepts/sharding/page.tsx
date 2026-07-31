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
          One machine can&rsquo;t hold everything, so you split the data across many. <em>How</em> you split it decides
          whether load stays even — and what a resharding costs.
        </p>
      </header>

      <Section title="Definition">
        <p>
          <strong>Sharding</strong> (horizontal partitioning) splits a dataset across independent nodes by a{" "}
          <strong>shard key</strong>. Each shard owns a subset of the keys and handles its own reads and writes, so
          total capacity scales with the number of shards. The two dominant schemes are <strong>range</strong> and{" "}
          <strong>hash</strong> — and the choice has very different failure modes.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Flip between <strong>range</strong> and <strong>hash</strong> sharding, and between a <strong>spread-out</strong>{" "}
          and a <strong>sequential</strong> key workload. Watch the load per shard, then press <strong>+ Shard</strong>{" "}
          and see how many keys have to move.
        </p>
        <ShardingViz />
      </Section>

      <Section title="Range vs hash">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Range</strong> keeps keys ordered, so range queries (<code>BETWEEN</code>, time windows) touch few shards. But monotonic keys — auto-increment ids, timestamps — all land in the last range, creating a <strong>hot shard</strong>.</li>
          <li><strong>Hash</strong> scatters keys evenly regardless of workload, killing hot spots. The cost: you lose ordered range scans, and naive <code>hash(key) % N</code> remaps nearly every key when <code>N</code> changes.</li>
        </ul>
      </Section>

      <Section title="The resharding problem">
        <p>
          With plain modulo hashing, adding one shard changes <code>key % N</code> for roughly{" "}
          <strong>(N−1)/N of all keys</strong> — a massive, cluster-wide data shuffle.{" "}
          <Link href="/concepts/consistent-hashing" className="text-sky-400 hover:text-sky-300">Consistent hashing</Link>{" "}
          fixes exactly this: adding or removing a node moves only ~1/N of the keys, not almost all of them.
        </p>
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
