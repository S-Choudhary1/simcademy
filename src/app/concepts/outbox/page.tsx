import Link from "next/link";
import type { Metadata } from "next";
import { OutboxViz } from "@/concepts/OutboxViz";

export const metadata: Metadata = {
  title: "Transactional Outbox — Interactive Concept",
  description:
    "The dual-write problem and the Transactional Outbox pattern, explained with an interactive step-through: inject a failure at every point and see how the outbox keeps DB state and events consistent.",
  keywords: ["outbox pattern", "transactional outbox", "dual write", "exactly once", "event publishing", "saga", "idempotency"],
  alternates: { canonical: "/concepts/outbox" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function OutboxPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Transactional Outbox</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
          Concept
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Transactional Outbox</h1>
        <p className="mt-2 text-slate-400">
          Save data and publish an event without ever losing one or the other — solving the dual-write problem.
        </p>
      </header>

      <Section title="The problem: dual writes">
        <p>
          A service method often needs to do two things: <strong>write to its database</strong> and{" "}
          <strong>publish an event</strong> (so other services react). The tempting code is:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`function createOrder(order) {
  db.save(order);              // write 1: database
  broker.publish("OrderCreated", order); // write 2: broker
}`}
        </pre>
        <p>
          These are <strong>two separate systems</strong> and there is no shared transaction. If the service crashes
          after the DB write but before the publish — or the broker is down — the order exists but no one is ever told.
          Publish first instead and you can emit an event for an order that never saved. This is the{" "}
          <strong>dual-write problem</strong>, and no amount of ordering or retries fully fixes it.
        </p>
      </Section>

      <Section title="The fix: an outbox in the same transaction">
        <p>
          Write the event into an <strong>outbox table in the same database transaction</strong> as the business data.
          Now the order and the &ldquo;intent to publish&rdquo; commit together — atomically. A separate{" "}
          <strong>relay</strong> (a poller, or change-data-capture on the DB log) reads unsent outbox rows, publishes
          them to the broker, and marks them sent. Delivery is decoupled from the transaction and can be retried
          safely.
        </p>
      </Section>

      <Section title="Try it — inject a failure at every point">
        <p>
          Switch between <strong>Naive dual-write</strong> and <strong>Transactional Outbox</strong>, pick a failure
          scenario, and press Run. Watch where each one ends up consistent — and where the naive version silently
          loses events.
        </p>
        <OutboxViz />
      </Section>

      <Section title="What the failures teach">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Naive, crash after DB:</strong> order saved, event lost — permanent inconsistency.</li>
          <li><strong>Outbox, transaction fails:</strong> nothing saved, nothing promised — atomic, still consistent.</li>
          <li><strong>Outbox, broker down:</strong> the row waits as PENDING; the relay retries until it&rsquo;s delivered.</li>
          <li><strong>Outbox, relay crashes after publishing:</strong> it republishes on restart — a duplicate, never a loss.</li>
        </ul>
        <p>
          So the outbox gives <strong>at-least-once</strong> delivery: never lost, occasionally duplicated. That is why
          consumers must be <strong>idempotent</strong> (dedupe by event id).
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          Certified mail with a logbook. Instead of &ldquo;file the document, then separately hope the letter is sent,&rdquo;
          you record &ldquo;letter to send&rdquo; in the same logbook entry as the filing. A courier later works the
          logbook and marks each letter delivered — retrying any that bounced. Nothing filed is ever left un-sent.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Event-driven microservices and, especially, every step of a{" "}
          <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">Saga</Link>: each local transaction uses
          an outbox to reliably emit the event that triggers the next step, so the saga never stalls on a lost message.
          Implemented via polling relays or CDC tools like Debezium reading the database log.
        </p>
      </Section>

      <Section title="How to implement">
        <p>Write the event inside the same transaction, then relay it out of band:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`BEGIN;
  INSERT INTO orders (...) VALUES (...);
  INSERT INTO outbox (id, type, payload, sent)
    VALUES (uuid(), 'OrderCreated', :json, false);
COMMIT;

-- Relay (separate process):
--   poll: SELECT * FROM outbox WHERE sent = false ORDER BY id;
--   publish each to the broker, then UPDATE ... SET sent = true;
--   (or use CDC — Debezium reading the WAL — instead of polling)`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Consumers dedupe by event id (the delivery is at-least-once).</li>
          <li>Prune or archive rows once <code>sent = true</code>.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Atomic with your data and never-lost events vs an extra table and a relay to operate.</li>
          <li>Guaranteed duplicates on failure — consumers must be idempotent.</li>
          <li>Polling adds latency and DB load; CDC (Debezium) cuts latency but adds infrastructure.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Publishing inside the transaction (a broker call can&rsquo;t be rolled back) — write to the outbox instead.</li>
          <li>Non-idempotent consumers, so the inevitable duplicate causes double side-effects.</li>
          <li>Forgetting to prune the outbox table — it grows forever without cleanup.</li>
          <li>Assuming the relay gives exactly-once. It&rsquo;s at-least-once; dedupe on the consumer.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <Link href="/concepts/circuit-breaker" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Circuit Breaker</Link>
          <Link href="/concepts/saga" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Saga</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Idempotency</span>
        </p>
      </Section>
    </main>
  );
}
