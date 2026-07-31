import Link from "next/link";
import type { Metadata } from "next";
import { IdempotencyViz } from "@/concepts/IdempotencyViz";

export const metadata: Metadata = {
  title: "Idempotency — Interactive Concept",
  description:
    "Idempotency explained with a live request/response demo: retry a POST /charges with the same Idempotency-Key and watch a naive handler double-charge while an idempotent one replays the original response.",
  keywords: ["idempotency", "idempotency key", "retries", "exactly once", "at-least-once", "payments", "safe retry"],
  alternates: { canonical: "/concepts/idempotency" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function IdempotencyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Idempotency</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Idempotency</h1>
        <p className="mt-2 text-slate-400">
          Make an operation safe to retry — doing it twice has the same effect as doing it once.
        </p>
      </header>

      <Section title="Definition">
        <p>
          An operation is <strong>idempotent</strong> if repeating it produces the same result as performing it once.
          GET and PUT are naturally idempotent; <code>POST /charges</code> is not — sending it twice charges twice. We
          make such writes idempotent with an <strong>idempotency key</strong> the client attaches, so the server can
          recognise a retry.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Networks are unreliable: a client sends a request, the response is lost, and the client retries — but the
          first request may have succeeded. At-least-once delivery (queues, webhooks, mobile clients on flaky networks)
          guarantees duplicates. Without idempotency, that means double charges, double orders, double emails.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          The same request is sent, then retried with the same <code>Idempotency-Key</code>. The naive handler creates
          a second charge; the idempotent handler recognises the key and replays the original response — one charge.
        </p>
        <IdempotencyViz />
      </Section>

      <Section title="Analogy">
        <p>
          A light switch labelled &ldquo;turn on&rdquo; is idempotent — flip it twice and the light is still just on. A
          switch labelled &ldquo;toggle&rdquo; is not. Idempotency keys turn a &ldquo;charge me&rdquo; button into a
          &ldquo;make sure this one charge exists&rdquo; button.
        </p>
      </Section>

      <Section title="How to implement">
        <p>The client generates a unique key per logical operation and sends it as a header:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`POST /v1/charges
Idempotency-Key: 8f3a1c2e-...(a UUID the client keeps for retries)

{ "amount": 100, "currency": "usd" }`}
        </pre>
        <p>On the server, before doing the work, atomically check-and-store the key:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`const seen = await store.get(key)          // Redis or an idempotency table
if (seen) return seen.response             // replay — do NOT redo the work

const result = await charge(amount)        // do the work once
await store.set(key, { response: result }, { ttlHours: 24 })
return result`}
        </pre>
        <p>Use a unique constraint (or <code>SET NX</code>) on the key so two concurrent retries can&rsquo;t both proceed.</p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>You must store keys + responses with a TTL — extra state and a lookup on every write.</li>
          <li>Concurrent duplicates need an atomic claim (unique index / <code>SET NX</code>) or a lock, or both can slip through.</li>
          <li>Key scope matters: too broad and you wrongly dedupe distinct operations; too narrow and retries aren&rsquo;t recognised.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Server-generated keys — the client must send the <em>same</em> key on a retry, so the client generates it.</li>
          <li>Storing the key only after the work succeeds, leaving a race window for concurrent retries.</li>
          <li>Assuming at-least-once delivery is exactly-once — it never is; idempotency is how you cope.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/outbox" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Transactional Outbox</Link>
          <Link href="/concepts/saga" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Saga</Link>
          <Link href="/concepts/locking" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Locking</Link>
        </p>
      </Section>
    </main>
  );
}
