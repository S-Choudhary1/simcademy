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
          Commit one transaction across several databases or services, all-or-nothing — with a coordinator, and a
          well-known catch.
        </p>
      </header>

      <Section title="Definition">
        <p>
          2PC gets multiple participants to commit a single transaction together — either all of them commit, or
          none do. A <strong>coordinator</strong>{" "}runs two rounds:
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Prepare</strong>: the coordinator asks every participant to get ready. Each one locks the data,
            writes the pending change to disk, and replies YES (&ldquo;I can commit this&rdquo;) or NO.
          </li>
          <li>
            <strong>Commit or abort</strong>: if every participant said YES, the coordinator tells everyone to
            COMMIT. If even one said NO, it tells everyone to ABORT and roll back.
          </li>
        </ol>
      </Section>

      <Section title="The problem it solves">
        <p>
          A normal database gives you one COMMIT that&rsquo;s all-or-nothing. But if a single transaction touches two
          separate databases or services, there&rsquo;s no shared COMMIT button that covers both of them. 2PC fakes
          one: it makes sure either every participant applies the change, or none of them do — never a half-done
          state split across systems.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Click <strong>All commit</strong>{" "}for the happy path. Click <strong>One aborts</strong>{" "}to see a single NO
          vote roll everything back. Click <strong>Coordinator crash</strong>{" "}to see participants stuck waiting —
          they&rsquo;ve already said YES and locked their data, but with no coordinator left to tell them commit or
          abort, they can&rsquo;t safely do either. That stuck state is 2PC&rsquo;s biggest weakness, known as{" "}
          <strong>blocking</strong>.
        </p>
        <TwoPhaseCommitViz />
      </Section>

      <Section title="Analogy">
        <p>
          A wedding officiant asks each partner &ldquo;do you?&rdquo; (prepare). Only if <em>both</em>{" "}say yes does
          the officiant pronounce them married (commit). If the officiant faints right after the vows but before
          pronouncing, everyone is stuck waiting — nobody can finish the ceremony alone.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Classic distributed transactions via XA/JTA transaction managers, and some databases that coordinate
          commits across their own internal shards. Modern microservice systems mostly avoid 2PC in favour of a{" "}
          <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">saga</Link> — trading strict,
          instant atomicity for a system that never gets stuck.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Use an existing XA-capable transaction manager (JTA, MSDTC) rather than writing the coordinator yourself.</li>
          <li>Every participant must save its &ldquo;prepared&rdquo; state to disk before replying YES — otherwise it can&rsquo;t safely resume after a restart.</li>
          <li>The coordinator must also save its final decision to disk before sending it out, and resend that decision if it restarts.</li>
          <li>Add timeouts so a stuck participant doesn&rsquo;t wait forever for a crashed coordinator — but note it still can&rsquo;t safely guess the right answer on its own; all it can do is keep retrying to reach the coordinator.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Strict all-or-nothing correctness across systems vs <strong>blocking</strong>: if the coordinator disappears right after Phase 1, participants sit there holding locks until it comes back.</li>
          <li>It&rsquo;s slow — two network round trips, plus a durable disk write on every participant, for every transaction.</li>
          <li>One slow or unreachable participant stalls the whole commit for everyone else. Newer protocols (three-phase commit, consensus-based commit) shrink the blocking window but add their own complexity.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reaching for 2PC across microservices by default — at scale, the blocking and tight coupling usually make a saga the better fit.</li>
          <li>Skipping the durable &ldquo;prepared&rdquo; record — without it, a participant that restarts can&rsquo;t honour whatever the coordinator decided.</li>
          <li>Assuming 2PC handles a network partition gracefully — a partition during Phase 2 <em>is</em>{" "}the stuck, blocking scenario above.</li>
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
