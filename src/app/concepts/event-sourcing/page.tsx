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
          Store every change that happened, not just the current state — then rebuild any state by replaying them.
        </p>
      </header>

      <Section title="Definition">
        <p>
          Instead of storing just the current value (like a mutable <code>balance</code> column you overwrite on every
          update), you store every change as it happens, in order, as an <strong>event</strong> — for example{" "}
          <em>Deposited $100</em>, then <em>Withdrew $30</em>. This append-only list of events is the{" "}
          <strong>source of truth</strong>. The current state isn&rsquo;t stored anywhere directly — it&rsquo;s
          calculated by replaying every event in order, a step called a <strong>fold</strong> (just a term for
          &ldquo;combine these one at a time into a running result,&rdquo; the same idea as a running total).
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          If you only ever store the current balance, you throw away history: you can&rsquo;t answer &ldquo;what did
          this look like last Tuesday?&rdquo;, there&rsquo;s no audit trail of what happened and when, and you
          can&rsquo;t build a brand-new view of old data after the fact. Event sourcing keeps every change, so
          history, audits, and new read views are all recoverable later — even ones you didn&rsquo;t think to build
          yet.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Append a few deposits and withdrawals to the log, then drag the <strong>time-travel</strong> scrubber. The
          balance you see isn&rsquo;t stored anywhere — it&rsquo;s recomputed on the spot by replaying every event up
          to that point in time.
        </p>
        <EventSourcingViz />
      </Section>

      <Section title="Analogy">
        <p>
          A bank ledger, or a Git repository. You don&rsquo;t keep only today&rsquo;s balance or only the latest
          version of a file — you keep every transaction, or every commit, and you can reconstruct any past state by
          replaying from the start.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Accounting and ledgers, order and trading systems, and any audit-heavy domain where &ldquo;what exactly
          happened, and when&rdquo; matters as much as the final number. It pairs naturally with{" "}
          <Link href="/concepts/cqrs" className="text-sky-400 hover:text-sky-300">CQRS</Link> — the events feed{" "}
          projections that become read models — and ships those events reliably via the{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link> pattern.
        </p>
      </Section>

      <Section title="How to implement">
        <p>
          Append immutable events — never update or delete one. Rebuild state by folding (replaying) them in order.
          For a long history, take a snapshot every so often so you don&rsquo;t have to replay from the very
          beginning each time:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// write: append, never update
store.append(accountId, { type: "Deposited", amount: 100 })

// read: fold the events into current state
const state = events.reduce(apply, initialState)

// performance: snapshot every N events, then replay only events after it
const state = apply(loadSnapshot(id), eventsSince(snapshot.version))`}
        </pre>
        <p>
          Publish each event too, so other parts of the system — projections, other services — can build their own
          views from the same history.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Full history, an audit trail, time travel, and rebuildable read models — at the cost of a genuinely different way of modelling your data.</li>
          <li>Querying needs a projection; you can&rsquo;t just <code>SELECT</code> the current state straight out of the event log.</li>
          <li>Replaying a long log gets slow without snapshots, and events need a versioning plan for when your schema changes.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Editing or deleting a past event — the log must stay immutable; fix mistakes by appending a new corrective event instead.</li>
          <li>Skipping snapshots, so rebuilding one aggregate replays thousands of events every single time.</li>
          <li>Not versioning event schemas, so old events can&rsquo;t be replayed anymore once the shape of an event changes.</li>
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
