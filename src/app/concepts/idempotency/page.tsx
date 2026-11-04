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
          An operation is <strong>idempotent</strong> if doing it once or doing it five times leaves things in
          exactly the same state. <code>GET</code> and <code>PUT</code> requests are naturally idempotent, but{" "}
          <code>POST /charges</code> is not — sending it twice charges the customer twice. We make a write like that
          safe to retry by having the client attach an <strong>idempotency key</strong>: a unique ID the server can
          use to recognise &ldquo;this is a retry of a request I&rsquo;ve already handled.&rdquo;
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Networks are unreliable. A client sends a request, the response gets lost on the way back, and the client
          — not knowing whether the request actually worked — retries it. But the first request may well have
          already succeeded. Any <strong>at-least-once</strong> system (message queues, webhooks, mobile apps on
          flaky networks) guarantees this will happen sometimes. Without idempotency, that turns into double charges,
          double orders, or double emails.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          The same request is sent, then retried with the same <code>Idempotency-Key</code>. The naive handler
          creates a second charge; the idempotent handler recognises the key and replays the original response — one
          charge either way.
        </p>
        <IdempotencyViz />
      </Section>

      <Section title="Analogy">
        <p>
          A light switch labelled &ldquo;turn on&rdquo; is idempotent — flip it twice and the light is still just on.
          A switch labelled &ldquo;toggle&rdquo; is not — flip it twice and you&rsquo;re back where you started, or
          worse, you&rsquo;re no longer sure of the state. An idempotency key turns a &ldquo;charge the
          customer&rdquo; button into a &ldquo;make sure exactly one charge like this exists&rdquo; button.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Payment APIs — Stripe&rsquo;s <code>Idempotency-Key</code> header is the canonical real-world example —
          along with webhook handlers (which must tolerate the sender retrying a delivery), mobile apps retrying
          requests over flaky networks, and any consumer reading from an at-least-once message queue.
        </p>
      </Section>

      <Section title="How to implement">
        <p>The client generates a unique key per logical operation and sends it as a header:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`POST /v1/charges
Idempotency-Key: 8f3a1c2e-...(a UUID the client keeps for retries)

{ "amount": 100, "currency": "usd" }`}
        </pre>
        <p>On the server, before doing the work, check whether that key has been seen already:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`const seen = await store.get(key)          // Redis or an idempotency table
if (seen) return seen.response             // replay — do NOT redo the work

const result = await charge(amount)        // do the work once
await store.set(key, { response: result }, { ttlHours: 24 })
return result`}
        </pre>
        <p>
          That get-then-set is not atomic on its own — use a unique constraint on the key (or Redis <code>SET NX</code>)
          to <em>claim</em> it first, so two concurrent retries for the same key can&rsquo;t both slip through and do
          the work twice.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>You must store keys and their responses with a TTL (an expiry time) — that&rsquo;s extra state and a lookup on every write.</li>
          <li>Concurrent duplicates need an atomic claim (a unique index, or <code>SET NX</code>) or a lock; without one, both can slip through at once.</li>
          <li>Key scope matters: too broad and you wrongly dedupe two genuinely different operations; too narrow and a real retry isn&rsquo;t recognised as one.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Letting the server generate the key — the client must send the <em>same</em> key on a retry, so the client has to be the one that generates it.</li>
          <li>Storing the key only after the work succeeds, which leaves a race window where a concurrent retry can sneak through.</li>
          <li>Assuming at-least-once delivery is exactly-once — it never is; idempotency is how you cope with that.</li>
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
