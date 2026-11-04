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
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
          Concept
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Replication</h1>
        <p className="mt-2 text-slate-400">
          Copy the same data onto multiple servers so reads can scale and the system survives a crash — with one
          catch: the copies can fall behind.
        </p>
      </header>

      <Section title="Definition">
        <p>
          In the most common setup — <strong>leader-follower</strong>{" "}(also called primary-replica) replication —
          every write goes to one server, the <strong>leader</strong>. The leader streams those changes out to one
          or more other servers, called <strong>followers</strong>, which apply the same changes and can serve read
          requests. Because that streaming takes a moment, a follower is always a little behind the leader. That gap
          is called <strong>replication lag</strong>.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          A single server can only handle so many reads, and if it goes down, the whole system goes down with it.
          Replication fixes both problems: followers soak up extra read traffic (<strong>read scaling</strong>), and
          if the leader fails, a follower can take its place (<strong>availability</strong>) — while writes still all
          go through one place, so there&rsquo;s never confusion about which copy is the real one.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Add followers to raise read capacity — writes still only go to the leader. <strong>Read from a follower</strong>{" "}
          while it&rsquo;s still catching up and you&rsquo;ll get a stale value. Then <strong>fail the leader</strong>{" "}
          and <strong>promote</strong>{" "}a follower to take over — if that follower was behind, whatever it missed is
          gone.
        </p>
        <ReplicationViz />
      </Section>

      <Section title="Analogy">
        <p>
          A head office (the leader) mails price updates out to branch stores (the followers). Each branch answers
          customer questions (reads) using its own copy, which might be a day out of date. If head office burns down,
          whichever branch has the most up-to-date copy takes over as the new head office.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Read replicas in{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link>{" "}and{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link>{" "}replica sets,
          and the read side of nearly every large system. It underpins{" "}
          <Link href="/concepts/base" className="text-sky-400 hover:text-sky-300">BASE</Link>{" "}and the availability
          half of <Link href="/concepts/cap" className="text-sky-400 hover:text-sky-300">CAP</Link>.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Stand up followers that stream changes from the leader (PostgreSQL streaming replication and replication slots, or a MongoDB replica set).</li>
          <li>Route writes to the leader and reads to followers — either in your application code or through a proxy built for this (PgBouncer + Patroni for PostgreSQL, ProxySQL for MySQL).</li>
          <li>Choose <strong>async</strong>{" "}replication (fast, but a crash can lose the most recent writes) or <strong>sync</strong>{" "}replication (no data loss, but every write waits for a follower to confirm, which adds latency).</li>
          <li>Automate failover with a tool that promotes the most-caught-up follower (Patroni, Orchestrator) instead of doing it by hand.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Scales <strong>reads</strong>{" "}and adds availability — but never scales <strong>writes</strong>, since there&rsquo;s still only one leader. Scaling writes needs sharding instead.</li>
          <li>Async replication risks stale reads and lost writes on failover; sync replication avoids data loss but slows every write down.</li>
          <li>Failover has a brief window of unavailability, and if done by hand without safeguards, it risks two servers both thinking they&rsquo;re the leader at once (split-brain).</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reading your own write back from a lagging follower and seeing stale data — fix this by routing a user back to the leader (or a follower you know is caught up) right after they write.</li>
          <li>Expecting replicas to scale writes — they don&rsquo;t; every write still goes through the single leader.</li>
          <li>Doing manual failover with no fencing (a way to force the old leader to stop accepting writes) — that&rsquo;s how you end up with two nodes both acting as leader at once.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP</Link>
          <Link href="/concepts/base" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">BASE</Link>
          <Link href="/concepts/sharding" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
        </p>
      </Section>
    </main>
  );
}
