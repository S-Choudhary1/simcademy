import Link from "next/link";
import type { Metadata } from "next";
import { EventSourcingViz } from "@/concepts/EventSourcingViz";

export const metadata: Metadata = {
  title: "Event Sourcing — Interactive Concept",
  description:
    "Event sourcing explained with an interactive append-only log: state is a fold over events, and a scrubber time-travels to rebuild any past state. Includes how to implement and trade-offs.",
  keywords: ["event sourcing", "event store", "append-only log", "projections", "time travel", "audit log", "CQRS"],
  alternates: { canonical: "/concepts/event-sourcing" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function EventSourcingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Event Sourcing</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Event Sourcing</h1>
        <p className="mt-2 text-slate-400">
          Store the sequence of changes, not the current state — and derive state by replaying them.
        </p>
      </header>

      <Section title="Definition">
        <p>
          Instead of a mutable <code>balance</code> column, you persist an append-only log of <strong>events</strong>{" "}
          (<em>Deposited $100</em>, <em>Withdrew $30</em>). The current state is a <strong>fold</strong> over that log.
          The log is the source of truth; state is a derived view you can always recompute.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Storing only current state throws away history: you can&rsquo;t answer &ldquo;what did this look like last
          Tuesday?&rdquo;, you have no audit trail, and you can&rsquo;t build a new view of old data. Event sourcing
          keeps every change, so history, audit, and new projections are all recoverable.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Append deposits and withdrawals to the log, then drag the <strong>time-travel</strong> scrubber: the balance
          is recomputed by replaying events up to that point. There is no stored balance — it&rsquo;s always derived.
        </p>
        <EventSourcingViz />
      </Section>

      <Section title="Analogy">
        <p>
          A bank ledger, or Git. You don&rsquo;t keep only today&rsquo;s balance / the latest file — you keep every
          transaction / commit, and reconstruct any state by replaying from the start.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Accounting and ledgers, order and trading systems, and audit-heavy domains. It pairs naturally with{" "}
          <Link href="/concepts/cqrs" className="text-sky-400 hover:text-sky-300">CQRS</Link> — the events feed
          projections that become read models — and reliably ships those events via the{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link>.
        </p>
      </Section>

      <Section title="How to implement">
        <p>Append immutable events; rebuild state by folding; snapshot to keep replay fast:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// write: append, never update
store.append(accountId, { type: "Deposited", amount: 100 })

// read: fold the events into current state
const state = events.reduce(apply, initialState)

// performance: snapshot every N events, then replay only events after it
const state = apply(loadSnapshot(id), eventsSince(snapshot.version))`}
        </pre>
        <p>Publish each event so projections (and other services) can build their own views.</p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Full history, audit, time travel, and rebuildable read models vs the complexity of a fundamentally different model.</li>
          <li>Querying needs projections — you can&rsquo;t just <code>SELECT</code> current state from the log.</li>
          <li>Replaying a long log is slow without snapshots; and events must be versioned as the schema evolves.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Editing or deleting past events — the log must be immutable (append a corrective event instead).</li>
          <li>No snapshots, so rebuilding an aggregate replays thousands of events.</li>
          <li>Not versioning event schemas, so old events can&rsquo;t be replayed after a change.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/cqrs" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CQRS</Link>
          <Link href="/concepts/outbox" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Transactional Outbox</Link>
          <Link href="/concepts/saga" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Saga</Link>
        </p>
      </Section>
    </main>
  );
}
