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
          double-charge, never lose a payment, and always agree with the bank. That shapes every choice toward strong
          guarantees over raw speed.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Authorize and capture a payment against a provider.</li>
          <li>Record every state change in an immutable ledger.</li>
          <li>Notify merchants of the result (webhooks), reliably.</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Exactly-once <em>effect</em> — a retried request must not charge twice (idempotency).</li>
          <li>Durability and auditability of every transaction.</li>
          <li>Protection from abuse and traffic spikes.</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          A rate limiter fronts the payment service, admitting a fixed rate and rejecting the rest with 429 — push the
          traffic above its limit to watch it shed load and protect the ledger DB. Everything downstream is sized for
          safety, not maximum throughput.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          Charge: client → rate limiter → gateway → payment service. The service checks an <strong>idempotency key</strong>{" "}
          (dedupe retries), calls the provider, writes the result to the ledger, and — in the same transaction — writes
          an outbox event. A relay later publishes the webhook.
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Rate limiter</strong> — a token bucket that protects the service from spikes and abuse.</li>
          <li><strong>Payment service</strong> — idempotent by design; the same key returns the same result.</li>
          <li><strong>Ledger DB</strong> — append-only, strongly consistent record of truth.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          The payment service scales horizontally, but the <strong>ledger</strong> favours strong consistency, so you
          scale it carefully (partition by merchant/account rather than loosening guarantees). Reads (history,
          reporting) go to replicas or a separate read model.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          A crash between charging the provider and writing the ledger is the nightmare — solved by{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">idempotency keys and the outbox</Link>,
          so retries are safe and webhooks are never lost. Provider failures are wrapped in a{" "}
          <Link href="/concepts/circuit-breaker" className="text-sky-400 hover:text-sky-300">circuit breaker</Link>.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          A <Link href="/concepts/rate-limiting" className="text-sky-400 hover:text-sky-300">rate limiter</Link> (often
          Redis-backed), an API gateway, an idempotent payment service, and a strongly consistent{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link> ledger with
          an outbox relay to a broker.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>Idempotency key up front, then charge + ledger + outbox in one transaction:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`POST /v1/charges
Idempotency-Key: 8f3a-...          // client-generated, resent on retry
{ "amount": 100, "currency": "usd" }

// handler
if (seen(key)) return stored(key)             // idempotent — no double charge
const auth = await breaker(() => provider.authorize(amount))  // circuit breaker
BEGIN;
  INSERT INTO ledger (id, amount, status) VALUES (...);
  INSERT INTO outbox (event = 'charge.succeeded', payload);   // same txn
COMMIT;
store(key, auth)
// a relay publishes the merchant webhook from the outbox (at-least-once)`}
        </pre>
        <p>
          This is <Link href="/concepts/idempotency" className="text-sky-400 hover:text-sky-300">idempotency</Link> +{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link> +{" "}
          <Link href="/concepts/circuit-breaker" className="text-sky-400 hover:text-sky-300">circuit breaker</Link> working together.
        </p>
      </Section>

      <Section title="11. Alternatives & Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Synchronous capture (simpler, slower) vs async settlement via events (faster ack, more moving parts).</li>
          <li>Strong-consistency ledger (safe) vs eventual consistency (never acceptable for money).</li>
          <li>Idempotency in the app vs relying on the provider&rsquo;s idempotency keys — usually both.</li>
        </ul>
      </Section>
    </main>
  );
}
