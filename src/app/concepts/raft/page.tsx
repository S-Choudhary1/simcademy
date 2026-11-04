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
          How a group of servers agree on one shared history of events, even when some of them crash. Raft runs
          underneath etcd, Consul, and CockroachDB — it was designed to be easier to understand than the older Paxos
          algorithm.
        </p>
      </header>

      <Section title="The problem it solves">
        <p>
          Imagine several servers that are supposed to hold identical copies of the same data. If they disagree about
          what happened, or in what order, the system is broken. Getting multiple servers to agree — even when some
          of them crash or lose network access — is called <strong>consensus</strong>.
        </p>
        <p>
          Raft solves consensus by electing one <strong>leader</strong> at a time. The leader decides the order
          events happen in; everyone else just copies what it says. Having a single leader in charge is what makes
          Raft much easier to reason about than approaches where every server negotiates as equals.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Five servers start up with S0 as leader. Click the leader to <strong>crash</strong> it. A follower will
          notice the silence, declare itself a <strong>candidate</strong>, and ask the others to vote for it. If it
          gets a majority of votes, it becomes the new leader for a new <strong>term</strong> (a counter that goes up
          by one every election). Add entries and watch each one turn from amber (not yet safe) to green once a{" "}
          <strong>majority</strong> of servers have stored a copy. Crash too many servers and nothing can be
          confirmed anymore — there aren&rsquo;t enough left to form a majority.
        </p>
        <RaftViz />
      </Section>

      <Section title="Leader election">
        <p>
          Every server runs a timer called the <strong>election timeout</strong>. While there&rsquo;s a working
          leader, it keeps sending small <em>heartbeat</em> messages that reset everyone&rsquo;s timer.
        </p>
        <p>
          If a server&rsquo;s timer runs out — meaning it hasn&rsquo;t heard from a leader in a while — it assumes
          the leader is gone and does three things: turns itself into a <strong>candidate</strong>, bumps the{" "}
          <strong>term</strong> number up by one, votes for itself, then asks every other server for its vote.
        </p>
        <p>
          Each server gives out only one vote per term, and only to a candidate whose log is at least as up to date
          as its own. Whoever collects votes from more than half the servers — a <strong>majority</strong> — becomes
          leader. Because winning requires a majority, there can only ever be one leader per term.
        </p>
      </Section>

      <Section title="Log replication &amp; commit">
        <p>
          Clients send their requests to the leader. The leader adds each one as a new entry in its log, then copies
          that entry out to every follower.
        </p>
        <p>
          An entry becomes <strong>committed</strong> once a majority of servers have stored it — at that point
          it&rsquo;s permanent and will survive even if the leader crashes immediately after. Only then does the
          leader apply it and tell followers to do the same.
        </p>
        <p>
          This is safe because any future election also needs a majority, and two majorities drawn from the same
          group of servers always overlap by at least one server. That one overlapping server is guaranteed to
          already know about every previously committed entry, so a new leader can never &ldquo;forget&rdquo; one.
        </p>
      </Section>

      <Section title="Why a majority (quorum)">
        <p>
          This majority rule is what keeps Raft safe: since any two majorities of the same cluster always share a
          server, two different leaders can never both win an election in the same term, and a committed entry can
          never quietly disappear.
        </p>
        <p>
          That overlap guarantee holds for a cluster of <em>any</em> size — it isn&rsquo;t special to odd numbers.
          Clusters are usually sized as odd numbers (3, 5, 7) purely for efficiency: a 4-server cluster still only
          tolerates 1 failure, exactly like a 3-server cluster, so the 4th server buys you nothing.
        </p>
        <p>
          The trade-off shows up when you lose too many servers. With 5 servers you can lose 2 and keep working
          normally. Lose a 3rd, and the remaining 2 can&rsquo;t form a majority — they still hold whatever was
          already committed (no data is lost), but they <strong>cannot elect a new leader or commit new writes</strong>{" "}
          until enough servers come back. Raft would rather freeze than risk two leaders disagreeing at once, a
          situation known as split-brain.
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          A chain of stores needs every branch to apply the same price changes, in the same order, even though head
          office&rsquo;s phone line to some branches occasionally drops. Instead of letting every branch manager make
          independent calls (chaos), the team elects one manager to act as &ldquo;head office&rdquo; for a while, and
          everyone copies that manager&rsquo;s decisions. If that manager goes quiet without warning, the others
          notice, hold a quick vote, and promote someone new — but only once more than half the team agrees on who
          is in charge.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Raft runs underneath <strong>etcd</strong> (which stores Kubernetes&rsquo; cluster state), HashiCorp{" "}
          <strong>Consul</strong>, <strong>CockroachDB</strong>, and plenty of other systems that need several
          servers to agree on one source of truth.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>You almost never write Raft from scratch — use a proven implementation (etcd, Consul, HashiCorp&rsquo;s raft library for Go) or a system already built on one.</li>
          <li>Pick an odd number of servers (3 or 5 are the common sizes) so you get the most fault tolerance for the hardware you&rsquo;re paying for.</li>
          <li>Design your app to fail closed when the cluster can&rsquo;t reach a majority — refuse writes rather than silently serving stale data.</li>
          <li>Tune the election timeout to your network: too short triggers needless elections on normal network hiccups; too long means slower failover when a leader really does crash.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Strong agreement and a simple mental model (one leader) vs needing a majority of servers reachable at all times to accept writes.</li>
          <li>Every write waits for a round trip to a majority of servers, so latency is higher than an unreplicated database.</li>
          <li>Odd cluster sizes waste no hardware; adding more servers than you need adds latency (more acks to wait for) without adding safety beyond what a majority already gives you.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Running an even number of servers — it costs you a server without buying extra fault tolerance.</li>
          <li>Assuming the cluster can accept writes as long as most servers are reachable <em>from the client</em> — what matters is whether those servers can reach a majority of <em>each other</em>.</li>
          <li>Confusing Raft (leader election plus majority-committed log) with plain leader-follower replication, which has no election or quorum — see <Link href="/concepts/replication" className="text-sky-400 hover:text-sky-300">Replication</Link> for that simpler case.</li>
        </ul>
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
