import Link from "next/link";
import type { Metadata } from "next";
import { LockingViz } from "@/concepts/LockingViz";

export const metadata: Metadata = {
  title: "Locking & Concurrency — Interactive Concept",
  description:
    "Optimistic vs pessimistic vs distributed locking, explained with a concurrent-writer simulation: watch a lost update happen with no lock, then get fixed by a version check or a row lock.",
  keywords: ["locking", "optimistic locking", "pessimistic locking", "distributed lock", "lost update", "concurrency", "SELECT FOR UPDATE", "redlock"],
  alternates: { canonical: "/concepts/locking" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function LockingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Locking</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Locking &amp; Concurrency</h1>
        <p className="mt-2 text-slate-400">
          When two requests touch the same row at once, something has to give — or an update gets lost.
        </p>
      </header>

      <Section title="Definition">
        <p>
          Concurrency control decides what happens when operations overlap. <strong>Optimistic</strong> locking assumes
          conflicts are rare and detects them with a version check at write time. <strong>Pessimistic</strong> locking
          assumes conflicts are likely and takes a lock up front so writers wait their turn. A <strong>distributed
          lock</strong> extends that across separate processes or services.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Two requests both read a balance of $100, both add $50, and both write back $150 — one write silently
          overwrites the other. The bank is now missing $50. That is the <strong>lost update</strong>, and it happens
          any time read-modify-write isn&rsquo;t protected.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Run it with <strong>No lock</strong> and watch the lost update. Then switch to <strong>Optimistic</strong>{" "}
          (the version check forces a retry) or <strong>Pessimistic</strong> (the row lock serializes the writers) —
          both reach the correct $200.
        </p>
        <LockingViz />
      </Section>

      <Section title="Analogy">
        <p>
          A shared document. Optimistic locking is &ldquo;save, and if someone edited since you opened it, you get a
          merge conflict&rdquo;. Pessimistic locking is &ldquo;check the file out so no one else can edit until you
          check it back in&rdquo;.
        </p>
      </Section>

      <Section title="How to implement">
        <p><strong>Optimistic</strong> — a version column; the write only lands if the version is unchanged:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`UPDATE accounts SET balance = 150, version = version + 1
WHERE id = 42 AND version = 1;      -- 0 rows updated → conflict → reload & retry`}
        </pre>
        <p><strong>Pessimistic</strong> — lock the row for the duration of the transaction:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`BEGIN;
  SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;  -- others block here
  UPDATE accounts SET balance = balance + 50 WHERE id = 42;
COMMIT;`}
        </pre>
        <p><strong>Distributed</strong> — across processes, a lease in Redis (release by matching the token, via a Lua script):</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`SET lock:account:42 <token> NX PX 30000   # acquire (fails if held); 30s expiry
# ... do the work ...
# release only if the token still matches (so you don't drop someone else's lock)`}
        </pre>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Optimistic</strong>: no waiting, great under low contention — but wasted work and retries when contention is high.</li>
          <li><strong>Pessimistic</strong>: simple correctness — but writers block, throughput drops, and you risk deadlocks.</li>
          <li><strong>Distributed locks</strong>: necessary across services, but add failure modes (lock expiry mid-work, clock skew; Redlock&rsquo;s safety is debated) — prefer a DB constraint or idempotency when you can.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Read-modify-write in app code with no version check or lock — the classic lost update.</li>
          <li>A distributed lock with no expiry (a crashed holder blocks everyone) or one that ignores the fencing token.</li>
          <li>Holding a lock across a slow network call, throttling the whole system.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/idempotency" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Idempotency</Link>
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP</Link>
        </p>
      </Section>
    </main>
  );
}
