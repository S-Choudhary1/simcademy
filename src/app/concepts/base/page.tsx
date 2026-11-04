import Link from "next/link";
import type { Metadata } from "next";
import { BaseViz } from "@/concepts/BaseViz";

export const metadata: Metadata = {
  title: "BASE / Eventual Consistency — Interactive Concept",
  description:
    "BASE (Basically Available, Soft state, Eventual consistency) explained with an interactive replication simulation: watch replicas serve stale reads, then converge.",
  keywords: ["BASE", "eventual consistency", "replication lag", "stale reads", "NoSQL", "availability"],
  alternates: { canonical: "/concepts/base" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function BasePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">BASE</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
          Concept
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">BASE &amp; Eventual Consistency</h1>
        <p className="mt-2 text-slate-400">
          Basically Available, Soft state, Eventually consistent — the pragmatic alternative to strict ACID at scale.
        </p>
      </header>

      <Section title="Definition">
        <p>
          BASE systems choose to stay <strong>available</strong> instead of being immediately consistent. A write is
          accepted and confirmed quickly on one server, then copied out to the other servers (replicas) in the
          background.
        </p>
        <p>
          During that short window, a replica can answer with old data — that&rsquo;s the <strong>soft state</strong>{" "}
          part. As long as no new writes come in, every replica eventually catches up and agrees — that&rsquo;s the{" "}
          <strong>eventually consistent</strong> part.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          If you make every replica confirm a write before telling the client it succeeded, one slow or unreachable
          replica can stall every single write. BASE trades a little bit of freshness for high availability and low
          latency — exactly the trade that large, read-heavy systems want to make.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Write a new value and watch it land on the primary server instantly, then ripple out to the replicas after
          a short replication delay. During that window, reading from a replica returns the old (stale) value.
        </p>
        <BaseViz />
      </Section>

      <Section title="Analogy">
        <p>
          A rumour spreading through a group. The moment you hear it, you know it — but it takes time to reach
          everyone, and until it does, different people give different answers. Eventually everyone agrees.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          DynamoDB, Cassandra, and read-replica setups in{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link> /{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link>. Any time you
          read from a replica instead of the primary, you are accepting BASE semantics.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Use asynchronous replication (or an eventually-consistent store) — accept the write on one node, then propagate it to the others in the background.</li>
          <li>Make updates idempotent and, ideally, commutative — last-write-wins timestamps or CRDTs — so replicas converge to the same value without needing to coordinate.</li>
          <li>Offer read-your-writes only where it matters, using sticky sessions or by reading from the primary for that specific flow.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Availability, scale, and low latency vs stale reads and the extra work of resolving conflicts.</li>
          <li>Great for feeds, counters, catalogs, and social graphs; the wrong choice for money or inventory (use <Link href="/concepts/acid" className="text-sky-400 hover:text-sky-300">ACID</Link> there).</li>
          <li>&ldquo;Eventually&rdquo; is not instant — under load, convergence can take seconds, not milliseconds.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reading your own write back from a lagging replica and showing the user stale data.</li>
          <li>Assuming &ldquo;eventually&rdquo; means immediately — under load, lag can stretch to seconds.</li>
          <li>Using eventual consistency where money or inventory needs a strong guarantee instead (use <Link href="/concepts/acid" className="text-sky-400 hover:text-sky-300">ACID</Link>).</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP</Link>
        </p>
      </Section>
    </main>
  );
}
