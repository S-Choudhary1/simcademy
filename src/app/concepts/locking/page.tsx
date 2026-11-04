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
          When two requests touch the same row at the same time, something has to give — or an update quietly
          disappears.
        </p>
      </header>

      <Section title="Definition">
        <p>
          <strong>Concurrency control</strong>{" "}decides what happens when two operations try to touch the same data at
          the same time. <strong>Optimistic locking</strong>{" "}assumes conflicts are rare: it lets both operations
          proceed and only checks for a conflict at write time, using a version number. <strong>Pessimistic
          locking</strong>{" "}assumes conflicts are common: it takes a lock up front, so one writer simply waits for the
          other to finish. A <strong>distributed lock</strong>{" "}is the same idea as pessimistic locking, but
          coordinated across separate processes or services instead of inside one database.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Two requests both read a balance of $100. Both add $50 on their own. Both write back $150. One of those two
          $50 deposits just vanished — the account should show $200, not $150. This is called a{" "}
          <strong>lost update</strong>, and it happens any time a &ldquo;read, then write based on what you
          read&rdquo; sequence isn&rsquo;t protected from another request doing the exact same thing at the same
          time.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Run it with <strong>No lock</strong>{" "}and watch the update get lost. Switch to <strong>Optimistic</strong>{" "}
          — the version check forces the second writer to retry — or <strong>Pessimistic</strong> — the row lock
          makes the second writer simply wait its turn. Both end up at the correct $200.
        </p>
        <LockingViz />
      </Section>

      <Section title="Analogy">
        <p>
          A shared document. Optimistic locking is &ldquo;save, and if someone edited it since you opened it, you get
          a merge conflict to resolve.&rdquo; Pessimistic locking is &ldquo;check the file out so no one else can
          edit it until you check it back in.&rdquo;
        </p>
      </Section>

      <Section title="How to implement">
        <p>
          <strong>Optimistic</strong> — keep a version number on the row; the write only succeeds if the version
          hasn&rsquo;t changed since you read it:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`UPDATE accounts SET balance = 150, version = version + 1
WHERE id = 42 AND version = 1;      -- 0 rows updated → conflict → reload & retry`}
        </pre>
        <p>
          <strong>Pessimistic</strong> — lock the row for the whole transaction so nobody else can touch it until
          you&rsquo;re done:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`BEGIN;
  SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;  -- others block here
  UPDATE accounts SET balance = balance + 50 WHERE id = 42;
COMMIT;`}
        </pre>
        <p>
          <strong>Distributed</strong> — across separate processes, a time-limited lease in Redis, released only by
          whoever holds the matching token (so you never accidentally release someone else&rsquo;s lock):
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`SET lock:account:42 <token> NX PX 30000   # acquire (fails if held); 30s expiry
# ... do the work ...
# release only if the token still matches (so you don't drop someone else's lock)`}
        </pre>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Optimistic</strong>: no waiting, and efficient when conflicts are rare — but wasted work and retries pile up once contention gets high.</li>
          <li><strong>Pessimistic</strong>: simple to reason about and always correct — but writers queue up behind each other, throughput drops, and locks taken in different orders can deadlock.</li>
          <li><strong>Distributed locks</strong>: sometimes the only option across services, but they add real failure modes (the lock expiring while you&rsquo;re still working, clocks on different machines drifting — Redlock&rsquo;s safety guarantees are genuinely disputed). Prefer a database constraint or idempotency check over a distributed lock whenever either one will do the job.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Doing read-modify-write in application code with no version check and no lock — the classic lost update.</li>
          <li>A distributed lock with no expiry (a crashed lock-holder blocks everyone forever) or one that ignores the fencing token (a slow, delayed writer can stomp on someone else&rsquo;s work).</li>
          <li>Holding a lock across a slow network call — that throttles everyone else waiting on it.</li>
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
