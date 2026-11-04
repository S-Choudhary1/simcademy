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
          When part of the network breaks and servers can&rsquo;t reach each other, a distributed system has to
          choose: stay correct, or stay available. It can&rsquo;t fully do both at the same time.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A distributed data store is one that keeps copies of your data on more than one server. CAP says that
          store can give you at most two of these three guarantees at the same time:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Consistency</strong>: every read gets back the most recent write — never a stale answer.</li>
          <li><strong>Availability</strong>: every request gets a response, even if it&rsquo;s not instant.</li>
          <li><strong>Partition tolerance</strong>: the system keeps working even when some servers can&rsquo;t talk to each other over the network.</li>
        </ul>
        <p>
          Network partitions (servers losing the ability to talk to each other) really do happen, so partition
          tolerance isn&rsquo;t something you can opt out of. That means the real choice you face, once a partition
          happens, is <strong>Consistency vs Availability</strong> — &ldquo;C vs A.&rdquo;
        </p>
      </Section>

      <Section title="The problem it captures">
        <p>
          Say two copies of your data (two replicas) can no longer talk to each other, and a write lands on one of
          them. The other replica is now out of date. You have exactly two choices: keep answering reads from the
          out-of-date replica anyway (available, but wrong), or refuse to answer until it catches up (correct, but
          unavailable). There is no third option while the two replicas can&rsquo;t communicate.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Click <strong>Partition network</strong> to cut the connection between servers A and B. Pick{" "}
          <strong>AP</strong> (favour <strong>Availability</strong>) or <strong>CP</strong> (favour{" "}
          <strong>Consistency</strong>), then write to A and read from B. In AP mode, B still answers — but with
          stale data. In CP mode, B refuses to answer rather than risk returning the wrong value. Heal the network
          and both modes catch back up.
        </p>
        <CapViz />
      </Section>

      <Section title="Analogy">
        <p>
          Two shop tills that normally share one price list. The link between them goes down, and head office
          changes a price at till A. Till B can either keep selling at the old price (open for business, but wrong)
          or stop selling that item until the link is back (correct, but closed).
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          <strong>AP</strong> systems (favour availability): DynamoDB, Cassandra, and reading from a read replica
          (see <Link href="/concepts/base" className="text-sky-400 hover:text-sky-300">BASE</Link>).{" "}
          <strong>CP</strong> systems (favour consistency): etcd, ZooKeeper, and quorum-based databases that refuse a
          write unless a majority of servers confirm it.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>You don&rsquo;t write code to implement CAP itself — you choose a CP store or an AP store, sometimes per operation.</li>
          <li>Pick a CP store (etcd, ZooKeeper, HBase) when correctness matters more than uptime; pick an AP store (DynamoDB, Cassandra) when uptime matters more than always having the very latest data.</li>
          <li>
            Some databases let you tune this per request using three numbers: <code>N</code> = how many replicas
            hold the data, <code>W</code> = how many replicas must confirm a write, <code>R</code> = how many
            replicas you read from. You get strong consistency when <code>W + R &gt; N</code> (a &ldquo;quorum&rdquo;
            read/write); you get maximum availability at <code>W = 1, R = 1</code>.
          </li>
          <li>For specific flows that must see their own writes immediately, route those reads to the primary, or use session consistency.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>CP</strong>: correct, but rejects requests during a partition — lower availability.</li>
          <li><strong>AP</strong>: always answers, but reads can be stale, and you have to resolve conflicts somehow (last-write-wins, vector clocks, CRDTs).</li>
          <li><strong>PACELC</strong> (an extension of CAP): even with no partition at all, synchronous replication still trades latency for consistency — <em>if</em> there&rsquo;s a <strong>P</strong>artition, choose <strong>A</strong>vailability or <strong>C</strong>onsistency; <strong>e</strong>lse, choose <strong>L</strong>atency or <strong>C</strong>onsistency.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Thinking you &ldquo;pick two of three&rdquo; freely — partition tolerance isn&rsquo;t optional in a real network, so the live choice is C vs A.</li>
          <li>Believing a system is purely CP or AP — real systems tune it per operation, and PACELC shows the latency-vs-consistency trade-off still exists even with no partition.</li>
          <li>Assuming &ldquo;consistent&rdquo; here means the same thing as ACID&rsquo;s &ldquo;C&rdquo; — CAP&rsquo;s Consistency specifically means every read sees the latest write (linearizability), which is a different guarantee from ACID.</li>
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
