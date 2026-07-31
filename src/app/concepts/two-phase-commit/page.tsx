import Link from "next/link";
import type { Metadata } from "next";
import { TwoPhaseCommitViz } from "@/concepts/TwoPhaseCommitViz";

export const metadata: Metadata = {
  title: "Two-Phase Commit (2PC) — Interactive Concept",
  description:
    "Two-phase commit explained with an interactive coordinator/participant simulation: prepare-and-vote then commit-or-abort, including the coordinator-crash blocking problem that makes 2PC unpopular at scale.",
  keywords: ["two-phase commit", "2PC", "distributed transaction", "XA", "coordinator", "prepare commit", "blocking"],
  alternates: { canonical: "/concepts/two-phase-commit" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function TwoPhaseCommitPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Two-Phase Commit</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Two-Phase Commit (2PC)</h1>
        <p className="mt-2 text-slate-400">
          Commit a transaction across several databases atomically — with a coordinator, and a well-known catch.
        </p>
      </header>

      <Section title="Definition">
        <p>
          2PC makes multiple participants commit all-or-nothing under a <strong>coordinator</strong>.{" "}
          <strong>Phase 1 (prepare)</strong>: the coordinator asks each participant to prepare and vote; a YES means
          &ldquo;I&rsquo;ve durably staged the change and can commit&rdquo;. <strong>Phase 2 (commit/abort)</strong>:
          if every vote is YES the coordinator tells everyone to COMMIT, otherwise everyone ABORTs.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          When one logical transaction spans separate databases or services, there is no shared COMMIT. 2PC provides
          that atomicity: either all participants apply the change or none do — no partial state across systems.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Run <strong>All commit</strong> for the happy path, <strong>One aborts</strong> to see a single NO vote roll
          everyone back, and <strong>Coordinator crash</strong> to watch participants get stuck in-doubt — holding
          locks, unable to decide. That is the blocking problem.
        </p>
        <TwoPhaseCommitViz />
      </Section>

      <Section title="Analogy">
        <p>
          A wedding officiant asks each partner &ldquo;do you?&rdquo; (prepare). Only if <em>both</em> say yes does the
          officiant pronounce them married (commit). If the officiant faints right after the vows but before
          pronouncing, everyone is stuck waiting — nobody can finish it alone.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Classic distributed transactions via XA/JTA transaction managers, and inside some databases across shards.
          In modern microservices it&rsquo;s largely avoided in favour of a{" "}
          <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">saga</Link> (availability over strict
          atomicity).
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Use an XA-capable transaction manager (JTA, MSDTC) rather than hand-rolling the protocol.</li>
          <li>Each participant must <strong>durably</strong> record the &ldquo;prepared&rdquo; state so it can recover and honour the coordinator&rsquo;s later decision.</li>
          <li>The coordinator writes its decision to a log before sending Phase 2, and re-sends on recovery.</li>
          <li>Add timeouts so a participant isn&rsquo;t blocked forever — but note it still can&rsquo;t safely decide alone.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Strong cross-system atomicity vs <strong>blocking</strong>: if the coordinator dies after prepare, participants hold locks in-doubt.</li>
          <li>Latency: two round trips plus durable fsyncs on every participant.</li>
          <li>Availability and scale suffer — one slow/failed participant stalls the whole commit. Three-phase commit and consensus-based commit reduce blocking but add complexity.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reaching for 2PC across microservices at scale — the blocking and coupling usually make a saga the better call.</li>
          <li>No durable prepare record, so a recovered participant can&rsquo;t honour the decision.</li>
          <li>Assuming 2PC is partition-tolerant — a partition during Phase 2 is exactly the blocking case.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/saga" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Saga</Link>
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP</Link>
        </p>
      </Section>
    </main>
  );
}
