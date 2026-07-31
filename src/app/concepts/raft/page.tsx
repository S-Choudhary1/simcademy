import Link from "next/link";
import type { Metadata } from "next";
import { RaftViz } from "@/concepts/RaftViz";

export const metadata: Metadata = {
  title: "Raft Consensus — Interactive Concept",
  description:
    "How the Raft consensus algorithm keeps a replicated log consistent: follower/candidate/leader states, leader election by election timeout and majority vote, and log replication that commits an entry once it's stored on a majority. Interactive visualization.",
  keywords: ["Raft", "consensus", "leader election", "log replication", "distributed systems", "term", "quorum", "majority", "replicated state machine", "Paxos alternative"],
  alternates: { canonical: "/concepts/raft" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function RaftPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Raft Consensus</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Raft Consensus</h1>
        <p className="mt-2 text-slate-400">
          How a cluster of servers agrees on a single, ordered log — even when machines crash. Raft is the algorithm
          behind etcd, Consul, and CockroachDB, designed to be understandable where Paxos is not.
        </p>
      </header>

      <Section title="The problem it solves">
        <p>
          You want several servers to behave like one reliable one: same data, same order, surviving crashes. That means
          they must <strong>agree</strong> on a sequence of commands (a replicated log). <strong>Consensus</strong> is
          how they agree despite failures; <strong>Raft</strong> is a consensus algorithm built around a single elected{" "}
          <strong>leader</strong> that makes agreement easy to follow.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Five servers start with S0 as leader. <strong>Crash the leader</strong> (click it) and watch a follower time
          out, become a <strong>candidate</strong>, win a majority of votes, and lead at a new <strong>term</strong>.{" "}
          <strong>Append entries</strong> and watch each one turn from amber (uncommitted) to green once a{" "}
          <strong>majority</strong> of servers store it. Crash servers past the majority and nothing can commit.
        </p>
        <RaftViz />
      </Section>

      <Section title="Leader election">
        <p>
          Every server keeps an <strong>election timeout</strong>. A leader sends periodic <em>heartbeats</em> that reset
          those timers. If a follower&rsquo;s timer fires (no heartbeat), it becomes a <strong>candidate</strong>,
          increments the <strong>term</strong> (a logical clock), votes for itself, and asks the others for votes. A
          server grants its vote once per term, to a candidate whose log is at least as up-to-date as its own. Win a{" "}
          <strong>majority</strong> and you&rsquo;re leader; there is at most one leader per term.
        </p>
      </Section>

      <Section title="Log replication &amp; commit">
        <p>
          Clients send commands to the leader, which appends each as a log entry and replicates it to followers. An entry
          is <strong>committed</strong> once it is safely stored on a <strong>majority</strong> of servers — at that
          point it will survive any future leader change, so the leader applies it and tells followers to do the same.
          Because a majority always overlaps the previous majority, a committed entry can never be lost.
        </p>
      </Section>

      <Section title="Why a majority (quorum)">
        <p>
          Any two majorities of an odd cluster share at least one server, so no two leaders can be elected in the same
          term and no committed entry can vanish. The flip side: with 5 servers you tolerate 2 failures, but lose 3 and
          the remaining 2 can never form a majority — the cluster stays available for reads it already has but{" "}
          <strong>cannot commit new entries</strong>. That is consensus refusing to risk split-brain.
        </p>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/replication" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Replication</Link>
          <Link href="/concepts/two-phase-commit" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Two-Phase Commit</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP Theorem</Link>
        </p>
      </Section>
    </main>
  );
}
