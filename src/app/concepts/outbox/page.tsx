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
          A service often needs to do two separate things at once: save something to its own database, and tell
          other services about it by publishing an event. The tempting code looks like this:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`function createOrder(order) {
  db.save(order);              // write 1: database
  broker.publish("OrderCreated", order); // write 2: broker
}`}
        </pre>
        <p>
          The database and the message broker are <strong>two separate systems</strong>, and there&rsquo;s no shared
          transaction covering both. If the service crashes after the database write but before the publish — or the
          broker is briefly down — the order exists, but no one downstream is ever told. Publish first instead, and
          you risk the opposite: announcing an order that never actually got saved. Retrying doesn&rsquo;t fix it
          either, because retrying whichever one already succeeded just duplicates it. This is the{" "}
          <strong>dual-write problem</strong>, and no amount of clever ordering fully solves it on its own.
        </p>
      </Section>

      <Section title="The fix: an outbox in the same transaction">
        <p>
          Write the event into an <strong>outbox table</strong>, inside the very same database transaction as the
          business data. Now the order row and the &ldquo;please publish this&rdquo; row either both get saved or
          neither does — the database guarantees that for you. A separate <strong>relay</strong> process then reads
          the not-yet-sent rows out of the outbox table, publishes each one to the broker, and marks it sent. That
          relay can be a simple poller that checks the table every few seconds, or a change-data-capture (CDC) tool
          like Debezium that watches the database&rsquo;s own write-ahead log — its internal record of every change —
          directly. Either way, publishing is now decoupled from the original transaction and can be retried safely
          without touching the business data again.
        </p>
      </Section>

      <Section title="Try it — inject a failure at every point">
        <p>
          Switch between <strong>Naive dual-write</strong> and <strong>Transactional Outbox</strong>, pick a failure
          scenario, and press Run. Watch where each approach ends up consistent — and where the naive version
          silently loses an event.
        </p>
        <OutboxViz />
      </Section>

      <Section title="What the failures teach">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Naive, crash after DB write:</strong> the order is saved, but the event is lost — a permanent inconsistency.</li>
          <li><strong>Outbox, transaction fails:</strong> nothing is saved and nothing is promised — the transaction keeps both sides consistent.</li>
          <li><strong>Outbox, broker down:</strong> the row sits as PENDING; the relay just keeps retrying until it gets delivered.</li>
          <li><strong>Outbox, relay crashes right after publishing:</strong> it republishes on restart — that&rsquo;s a duplicate, never a loss.</li>
        </ul>
        <p>
          So the outbox gives you <strong>at-least-once</strong> delivery: events are never lost, but they can
          occasionally arrive twice. That&rsquo;s why consumers reading from it must be{" "}
          <strong>idempotent</strong> — they should dedupe by event id.
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          Certified mail with a logbook. Instead of &ldquo;file the document, then separately hope the letter gets
          sent,&rdquo; you record &ldquo;letter to send&rdquo; in the very same logbook entry as the filing. A courier
          later works through the logbook and marks each letter delivered, retrying any that bounced. Nothing that
          was ever filed is left permanently un-sent.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Event-driven microservices in general, and especially every step of a{" "}
          <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">Saga</Link>: each local transaction
          uses an outbox to reliably emit the event that triggers the next step, so the saga never stalls because a
          message got dropped. Implemented either with polling relays or CDC tools like Debezium reading the
          database&rsquo;s change log.
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
--   (or use CDC — e.g. Debezium reading the write-ahead log — instead of polling)`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Consumers must dedupe by event id, since delivery out of the outbox is at-least-once, not exactly-once.</li>
          <li>Prune or archive rows once <code>sent = true</code> so the table doesn&rsquo;t grow forever.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Atomic with your data and events that are never silently lost, at the cost of an extra table and a relay process to run.</li>
          <li>Duplicates are guaranteed to happen eventually, so consumers must be idempotent — this isn&rsquo;t optional.</li>
          <li>Polling adds a little latency and extra load on the database; CDC cuts that latency but adds its own piece of infrastructure to run and monitor.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Publishing straight to the broker from inside the transaction — a broker call can&rsquo;t be rolled back if the transaction later fails. Write to the outbox instead.</li>
          <li>Writing consumers that aren&rsquo;t idempotent, so the inevitable duplicate delivery causes a double side-effect.</li>
          <li>Forgetting to prune the outbox table — left unchecked, it grows forever.</li>
          <li>Assuming the relay gives exactly-once delivery. It gives at-least-once; the consumer is responsible for deduping.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <Link href="/concepts/circuit-breaker" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Circuit Breaker</Link>
          <Link href="/concepts/saga" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Saga</Link>
          <Link href="/concepts/idempotency" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Idempotency</Link>
        </p>
      </Section>
    </main>
  );
}
