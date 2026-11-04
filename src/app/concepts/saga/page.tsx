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
          Run a transaction that spans several services as a chain of smaller steps, with a plan to undo them if one
          fails.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A saga breaks one business transaction that spans multiple services into a sequence of smaller{" "}
          <strong>local transactions</strong> — one per service, each committed on its own. If a later step fails,
          the saga runs a <strong>compensating transaction</strong> for every step that already succeeded, in reverse
          order, to undo their effects.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          You can&rsquo;t wrap one{" "}
          <Link href="/concepts/acid" className="text-sky-400 hover:text-sky-300">ACID</Link> transaction around
          several separate services and databases — there&rsquo;s no single shared commit button that covers all of
          them. A saga gets you atomicity of the <em>end result</em> instead: either everything happens, or
          everything gets undone — without needing a distributed lock across services.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Pick where a step should fail, then press Run. Watch the steps commit forward one by one (green), hit the
          failure (red), then watch the compensating transactions undo the earlier steps in reverse order (amber).
          Choose &ldquo;None&rdquo; to see the happy path, where nothing needs undoing.
        </p>
        <SagaViz />
      </Section>

      <Section title="Analogy">
        <p>
          Booking a trip: reserve the flight, then the hotel, then the car. If the car reservation fails, you
          don&rsquo;t keep a half-booked trip sitting around — you cancel the hotel and the flight (the
          compensations) to get back to a clean state.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          E-commerce checkout, travel booking, and any workflow that touches several services. There are two common
          styles: <strong>orchestration</strong>, where one coordinator calls each step in order (what this
          simulation shows), and <strong>choreography</strong>, where each service just reacts to the previous
          service&rsquo;s event with no central coordinator. Either way, publish each step&rsquo;s event reliably via
          the <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">Transactional Outbox</Link>.
        </p>
      </Section>

      <Section title="How to implement">
        <p>
          Orchestration is the simplest to reason about — one coordinator calls each step, and if any step throws, it
          calls the compensations for whatever already succeeded, in reverse order:
        </p>
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
          <li>With choreography instead, each service listens for the previous step&rsquo;s event and reacts on its own — no central coordinator (publish those events via the <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link>).</li>
          <li>Write a compensating action for every single step, and make both the steps and their compensations idempotent — either one can be retried after a crash or timeout.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Atomicity of the outcome across services, without a distributed lock or 2PC — but you lose isolation: other parts of the system can see things in a half-finished state while the saga is still running.</li>
          <li>Every step needs its own compensation to write and maintain, and some real actions genuinely can&rsquo;t be undone (you can refund a payment, but you can&rsquo;t un-send a confirmation email).</li>
          <li>Orchestration is centralized and easy to trace end-to-end; choreography has no single coordinator to fail, but it&rsquo;s harder to follow who reacts to what.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Writing a step with no compensating action — a failure partway through then has no way to roll back.</li>
          <li>Assuming isolation that doesn&rsquo;t exist — other transactions can see the saga&rsquo;s intermediate, half-done state; there is no global lock.</li>
          <li>Steps or compensations that aren&rsquo;t idempotent, so a retry ends up applying the same effect twice.</li>
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
