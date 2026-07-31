import Link from "next/link";
import type { Metadata } from "next";
import { CapViz } from "@/concepts/CapViz";
import { TopicMeme } from "@/components/memes";

export const metadata: Metadata = {
  title: "CAP Theorem — Interactive Concept",
  description:
    "The CAP theorem explained with an interactive simulation: partition the network and choose CP (consistent) or AP (available) to feel the tradeoff.",
  keywords: ["CAP theorem", "consistency", "availability", "partition tolerance", "CP", "AP", "distributed systems"],
  alternates: { canonical: "/concepts/cap" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function CapPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">CAP Theorem</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
          Concept
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">CAP Theorem</h1>
        <p className="mt-2 text-slate-400">
          When the network partitions, a distributed system must choose consistency or availability — not both.
        </p>
      </header>

      <Section title="Definition">
        <p>
          CAP says a distributed data store can provide at most two of three: <strong>Consistency</strong> (every read
          sees the latest write), <strong>Availability</strong> (every request gets a non-error response), and{" "}
          <strong>Partition tolerance</strong> (it keeps working despite dropped messages between nodes). Since network
          partitions <em>will</em> happen, the real choice during a partition is <strong>C vs A</strong>.
        </p>
      </Section>

      <Section title="The problem it captures">
        <p>
          When two replicas can&rsquo;t talk, and a write lands on one of them, the other is now behind. You either
          serve that stale replica anyway (available, inconsistent) or refuse to serve it until it catches up
          (consistent, unavailable). There is no third option while the partition lasts.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Hit <strong>Partition network</strong>, pick <strong>AP</strong> or <strong>CP</strong>, then write to A and
          read from B. In AP the read stays available but goes stale; in CP the read is rejected to protect
          consistency. Heal the network and both come back.
        </p>
        <CapViz />
      </Section>

      <Section title="Analogy">
        <p>
          Two shop tills that normally share one price list. The link goes down and head office changes a price at Till
          A. Till B can either keep selling at the old price (open for business, but wrong) or stop selling that item
          until the link is back (correct, but closed).
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          <strong>AP</strong> systems: DynamoDB, Cassandra, and read-replica reads (see{" "}
          <Link href="/concepts/base" className="text-sky-400 hover:text-sky-300">BASE</Link>).{" "}
          <strong>CP</strong> systems: etcd, ZooKeeper, and quorum-based databases that refuse writes without a majority
          (see <Link href="/concepts/acid" className="text-sky-400 hover:text-sky-300">ACID</Link>).
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>You don&rsquo;t code CAP — you choose it per system, or even per operation.</li>
          <li>Pick a CP store (etcd, ZooKeeper, HBase) when correctness must win; an AP store (DynamoDB, Cassandra) when availability must.</li>
          <li>
            With tunable stores, set consistency levels: strong when <code>R + W &gt; N</code> (e.g. QUORUM reads and
            writes); maximum availability at <code>W=1, R=1</code>.
          </li>
          <li>Give specific flows read-your-writes by routing them to the primary or using session consistency.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>CP</strong>: correct, but rejects requests during a partition — lower availability.</li>
          <li><strong>AP</strong>: always answers, but reads can be stale and you must resolve conflicts (last-write-wins, vector clocks, CRDTs).</li>
          <li><strong>PACELC</strong>: even with no partition, synchronous replication trades latency for consistency.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Thinking you &ldquo;pick two&rdquo; freely — partition tolerance isn&rsquo;t optional, so it&rsquo;s C vs A.</li>
          <li>Believing a system is purely CP or AP — real systems tune it per operation (and PACELC adds latency vs consistency when there&rsquo;s no partition).</li>
          <li>Assuming &ldquo;consistent&rdquo; means ACID — CAP&rsquo;s C is specifically linearizable reads.</li>
        </ul>
      </Section>

      <div className="mt-8"><TopicMeme topic="cap" /></div>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/base" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">BASE</Link>
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Quorum</span>
        </p>
      </Section>
    </main>
  );
}
