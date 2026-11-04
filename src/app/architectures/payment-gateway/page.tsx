import Link from "next/link";
import type { Metadata } from "next";
import { EmbeddedSim } from "@/sim/ui/EmbeddedSim";
import { ARCH_BY_SLUG } from "@/sim/architectures";

export const metadata: Metadata = {
  title: "Payment Gateway — Architecture",
  description:
    "How a payment gateway is designed for correctness: rate limiting, idempotency, a ledger database, and reliable event publishing via the outbox. Interactive architecture simulation.",
  keywords: ["payment gateway", "system design", "idempotency", "rate limiting", "ledger", "outbox", "exactly once"],
};

const arch = ARCH_BY_SLUG["payment-gateway"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function PaymentGatewayPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Architectures</span> / <span className="text-slate-300">Payment Gateway</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">Architecture</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Payment Gateway</h1>
        <p className="mt-2 text-slate-400">{arch.blurb}</p>
      </header>

      <Section title="1. Business Problem">
        <p>
          Take money reliably. Unlike most systems, here <strong>correctness beats throughput</strong>: never
          double-charge a customer, never lose a payment, and always agree with the bank about what happened. That
          priority shapes every design choice here toward strong guarantees over raw speed.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Authorize and capture a payment against a payment provider (e.g. a card network or bank).</li>
          <li>Record every state change in an immutable <strong>ledger</strong> — an append-only log of exactly what happened, in order, that is never edited after the fact.</li>
          <li>Notify merchants of the result reliably, usually via a <strong>webhook</strong> (the gateway calling back to a URL the merchant registered).</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>&ldquo;Exactly-once&rdquo; <em>effect</em> — if a request is retried (say, the client&rsquo;s network dropped before it saw the response), it must not charge the card twice. This is achieved through <strong>idempotency</strong>, not by somehow guaranteeing the network delivers the request exactly once.</li>
          <li>Durability and auditability of every transaction — you must be able to reconstruct exactly what happened, and when.</li>
          <li>Protection from abuse and sudden traffic spikes.</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          A <strong>rate limiter</strong> sits in front of the payment service, admitting requests up to a fixed rate
          and rejecting the rest with an HTTP 429 (&ldquo;too many requests&rdquo;) response — push the traffic above
          its limit in the simulation and watch it shed the excess load to protect the ledger database. Every
          component downstream of the limiter is sized for safety and correctness, not for squeezing out maximum
          throughput.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          <strong>Charge:</strong> client → rate limiter → gateway → payment service. The service first checks an{" "}
          <strong>idempotency key</strong> (a unique id the client generates once and resends unchanged on every
          retry, so the server can recognize &ldquo;I&rsquo;ve already handled this exact request&rdquo;), then calls
          the payment provider, writes the result to the ledger, and — in that <em>same</em> database transaction —
          writes an outbox event. A separate relay process later publishes the merchant webhook from that event.
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Rate limiter</strong> — a token bucket (a simple &ldquo;allowance that refills over time&rdquo; algorithm) that protects the service from traffic spikes and abuse.</li>
          <li><strong>Payment service</strong> — idempotent by design: calling it twice with the same idempotency key returns the same result instead of charging twice.</li>
          <li><strong>Ledger DB</strong> — an append-only, strongly consistent record of truth for every transaction.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          The payment service itself scales horizontally (just add more instances), but the <strong>ledger</strong>{" "}
          needs strong consistency above all else, so it&rsquo;s scaled carefully — by partitioning data across
          servers (e.g. by merchant or account), not by loosening its consistency guarantees to go faster. Read-heavy
          workloads like transaction history and reporting are pointed at read replicas or a separate read model
          instead of the live ledger.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          The nightmare scenario is a crash between successfully charging the provider and writing that result to the
          ledger — handled with{" "}
          <Link href="/concepts/idempotency" className="text-sky-400 hover:text-sky-300">idempotency keys</Link> and
          the{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">transactional outbox</Link>, so a
          retried request is safe and a webhook is never silently lost. Calls to the payment provider itself are
          wrapped in a{" "}
          <Link href="/concepts/circuit-breaker" className="text-sky-400 hover:text-sky-300">circuit breaker</Link>,
          so a provider outage fails fast instead of piling up stuck requests.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          A <Link href="/concepts/rate-limiting" className="text-sky-400 hover:text-sky-300">rate limiter</Link>{" "}
          (often backed by Redis), an API gateway, an idempotent payment service, and a strongly consistent{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link> ledger
          with an outbox relay publishing to a message broker.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>
          Claim the idempotency key <em>before</em> calling the provider — not after — so two concurrent retries with
          the same key can&rsquo;t both slip through and charge twice:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`POST /v1/charges
Idempotency-Key: 8f3a-...          // client-generated once, resent unchanged on retry
{ "amount": 100, "currency": "usd" }

// handler
BEGIN;
  INSERT INTO idempotency_keys (key, status) VALUES ($key, 'in_progress');
  -- key has a UNIQUE constraint: a concurrent duplicate request fails this
  -- insert and should wait for / return the first request's stored result
COMMIT;

const auth = await breaker(() => provider.authorize(amount))  // circuit breaker

BEGIN;
  INSERT INTO ledger (id, amount, status) VALUES (...);
  UPDATE idempotency_keys SET status = 'done', result = auth WHERE key = $key;
  INSERT INTO outbox (event = 'charge.succeeded', payload);   // same transaction
COMMIT;
// a relay publishes the merchant webhook from the outbox (at-least-once)`}
        </pre>
        <p>
          Checking &ldquo;have I seen this key?&rdquo; and only <em>afterwards</em> recording it is a classic race
          condition — two retries can both pass the check before either one finishes. Claiming the key first (with a
          unique constraint doing the hard work of rejecting duplicates atomically) is what real payment APIs, like
          Stripe&rsquo;s, do to actually close that gap. This is{" "}
          <Link href="/concepts/idempotency" className="text-sky-400 hover:text-sky-300">idempotency</Link> +{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link> +{" "}
          <Link href="/concepts/circuit-breaker" className="text-sky-400 hover:text-sky-300">circuit breaker</Link>{" "}
          working together.
        </p>
      </Section>

      <Section title="11. Alternatives & Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Synchronous capture (simpler, but the caller waits longer) vs async settlement via events (faster acknowledgment, more moving parts to operate).</li>
          <li>A strongly consistent ledger costs some latency and scaling flexibility, but it&rsquo;s what makes the &ldquo;never disagree with the bank&rdquo; guarantee possible — most payment systems consider that worth the cost.</li>
          <li>Idempotency enforced in your own app vs relying solely on the provider&rsquo;s idempotency keys — real systems typically do both, since you don&rsquo;t fully control the provider&rsquo;s failure modes.</li>
        </ul>
      </Section>
    </main>
  );
}
