import Link from "next/link";
import type { Metadata } from "next";
import { ReplicationViz } from "@/concepts/ReplicationViz";

export const metadata: Metadata = {
  title: "Replication — Interactive Concept",
  description:
    "Leader-follower replication explained with a live simulation: writes go to the leader, followers lag behind, reads scale across followers (but can be stale), and a follower is promoted on failover.",
  keywords: ["replication", "leader follower", "primary replica", "read scaling", "replication lag", "failover", "stale reads"],
  alternates: { canonical: "/concepts/replication" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function ReplicationPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Replication</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Replication</h1>
        <p className="mt-2 text-slate-400">
          Copy data to multiple nodes for read scaling and availability — and live with the lag.
        </p>
      </header>

      <Section title="Definition">
        <p>
          In <strong>leader-follower</strong> (primary-replica) replication, all writes go to one <strong>leader</strong>,
          which streams its changes to <strong>followers</strong>. Followers apply those changes and can serve reads.
          Because streaming is asynchronous, followers trail the leader by a <strong>replication lag</strong>.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          One node can&rsquo;t serve unlimited reads or survive its own failure. Replication spreads reads across
          followers (read scaling) and keeps standbys ready to take over (availability) — while keeping a single source
          of truth for writes.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Add followers to raise read capacity (writes still only hit the leader). <strong>Read from a follower</strong>{" "}
          while it&rsquo;s catching up to hit a stale value. Then <strong>fail the leader</strong> and{" "}
          <strong>promote</strong> — if a follower was behind, those writes are lost.
        </p>
        <ReplicationViz />
      </Section>

      <Section title="Analogy">
        <p>
          A head office (leader) that mails updates to branch offices (followers). Branches answer customer questions
          (reads) from their latest copy — which might be a day behind head office. If head office burns down, the
          most up-to-date branch takes over.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Read replicas in{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link> /{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link> replica sets,
          and the read side of nearly every large system. It underpins{" "}
          <Link href="/concepts/base" className="text-sky-400 hover:text-sky-300">BASE</Link> and the availability half
          of <Link href="/concepts/cap" className="text-sky-400 hover:text-sky-300">CAP</Link>.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Stand up followers streaming from the leader (e.g. Postgres streaming replication / replication slots).</li>
          <li>Route writes to the leader and reads to followers — in the app, or via a proxy (PgBouncer/Patroni, ProxySQL).</li>
          <li>Pick <strong>async</strong> (fast, may lose recent writes on failover) or <strong>sync</strong> (no loss, higher latency) replication.</li>
          <li>Automate failover with a manager (Patroni, Orchestrator) that promotes the most-caught-up follower.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Scales <strong>reads</strong> and adds availability — but never scales <strong>writes</strong> (still one leader; that needs sharding).</li>
          <li>Async replication means stale reads and possible data loss on failover; sync fixes loss but slows writes.</li>
          <li>Failover has a window of unavailability and, done wrong, risks split-brain (two leaders).</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reading your own write from a lagging follower and showing stale data (needs read-your-writes routing).</li>
          <li>Expecting replicas to scale writes — they don&rsquo;t.</li>
          <li>Manual failover with no fencing → two nodes both think they&rsquo;re the leader (split-brain).</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP</Link>
          <Link href="/concepts/base" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">BASE</Link>
          <Link href="/concepts/consistent-hashing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
        </p>
      </Section>
    </main>
  );
}
