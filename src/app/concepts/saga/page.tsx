import Link from "next/link";
import type { Metadata } from "next";
import { SagaViz } from "@/concepts/SagaViz";

export const metadata: Metadata = {
  title: "Saga Pattern — Interactive Concept",
  description:
    "The Saga pattern explained with an interactive simulation: run a distributed transaction as a chain of local steps and watch compensation undo the committed ones when a later step fails.",
  keywords: ["saga pattern", "distributed transaction", "compensation", "microservices", "orchestration", "choreography"],
  alternates: { canonical: "/concepts/saga" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function SagaPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Saga Pattern</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Saga Pattern</h1>
        <p className="mt-2 text-slate-400">
          A distributed transaction as a chain of local transactions, with compensation to undo on failure.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A saga splits a business transaction that spans multiple services into a sequence of <strong>local
          transactions</strong>, one per service. Each step commits in its own database and triggers the next. If a
          later step fails, the saga runs <strong>compensating transactions</strong> — one per completed step, in
          reverse — to semantically undo the work.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          You can&rsquo;t hold one <Link href="/concepts/acid" className="text-sky-400 hover:text-sky-300">ACID</Link>{" "}
          transaction across separate services and databases — there is no shared commit. A saga gives you atomicity of{" "}
          <em>outcome</em> (everything happens, or everything is compensated) without a distributed lock.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Pick where a step fails and press Run. Watch the steps commit forward (green), the failure (red), then the
          compensating transactions undo the earlier steps in reverse (amber). Choose &ldquo;None&rdquo; to see the
          happy path.
        </p>
        <SagaViz />
      </Section>

      <Section title="Analogy">
        <p>
          Booking a trip: reserve the flight, then the hotel, then the car. If the car reservation fails, you don&rsquo;t
          keep a half-booked trip — you cancel the hotel and the flight (compensation) to get back to a clean state.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          E-commerce checkout, travel booking, and any multi-service workflow. Two styles:{" "}
          <strong>orchestration</strong> (a coordinator drives each step, as simulated here) and{" "}
          <strong>choreography</strong> (each service reacts to the previous one&rsquo;s event). Either way, steps
          publish their events reliably via the{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">Transactional Outbox</Link>.
        </p>
      </Section>

      <Section title="How to implement">
        <p>Orchestration — a coordinator drives each step and its compensation:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`try {
  await createOrder();
  await takePayment();
  await reserveInventory();
  await scheduleShipping();
} catch (failedAt) {
  // run compensations in reverse for completed steps
  await releaseInventory();
  await refundPayment();
  await cancelOrder();
}`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Or choreography: each service reacts to the previous step&rsquo;s event (published via the <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link>).</li>
          <li>Define a compensating action for every step, and make steps + compensations idempotent (they will be retried).</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Cross-service atomicity without a distributed lock/2PC vs no isolation — other transactions can see intermediate state.</li>
          <li>You must write and maintain a compensation for each step (and some actions can&rsquo;t truly be undone).</li>
          <li>Orchestration is centralized and easy to trace; choreography is decoupled but harder to follow.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>No compensating action for a step — you can&rsquo;t roll back, so partial failure sticks.</li>
          <li>Assuming isolation: other transactions can see intermediate saga state (no global lock).</li>
          <li>Non-idempotent steps/compensations, so a retry double-applies.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/outbox" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Transactional Outbox</Link>
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <Link href="/concepts/cqrs" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CQRS</Link>
        </p>
      </Section>
    </main>
  );
}
