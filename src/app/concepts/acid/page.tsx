import Link from "next/link";
import type { Metadata } from "next";
import { AcidViz } from "@/concepts/AcidViz";

export const metadata: Metadata = {
  title: "ACID — Interactive Concept",
  description:
    "ACID (Atomicity, Consistency, Isolation, Durability) explained with an interactive transaction simulation: watch a transfer roll back atomically on failure.",
  keywords: ["ACID", "transactions", "atomicity", "consistency", "isolation", "durability", "database"],
  alternates: { canonical: "/concepts/acid" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function AcidPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">ACID</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
          Concept
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">ACID</h1>
        <p className="mt-2 text-slate-400">
          The guarantees a database makes about transactions: Atomicity, Consistency, Isolation, Durability.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A transaction groups several operations so they succeed or fail as a unit. <strong>Atomicity</strong>:
          all-or-nothing. <strong>Consistency</strong>: the database moves from one valid state to another.{" "}
          <strong>Isolation</strong>: concurrent transactions don&rsquo;t corrupt each other. <strong>Durability</strong>:
          once committed, it survives crashes.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Without transactions, a crash between two writes leaves the system in a corrupt in-between state — money
          debited from one account but never credited to another. ACID guarantees that never happens.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Transfer $100 from A to B with a failure injected mid-way. Non-transactional loses the money (the invariant
          A + B breaks); ACID rolls the whole thing back.
        </p>
        <AcidViz />
      </Section>

      <Section title="Analogy">
        <p>
          A wire transfer at a bank. You would never accept &ldquo;we took it out of your account but it never arrived&rdquo;
          — the transfer either happens completely or not at all.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Relational databases (<Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link>,
          MySQL, SQL Server) provide full ACID. Document stores like{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link> give ACID within a
          single document and, more recently, across multi-document transactions.
        </p>
      </Section>

      <Section title="How to implement">
        <p>Wrap the operations in a transaction and let the database enforce the four properties:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
  UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;   -- or ROLLBACK on any error`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Choose an isolation level: <code>READ COMMITTED</code> (default) up to <code>SERIALIZABLE</code> for the strictest correctness.</li>
          <li>Keep transactions short to reduce lock contention; durability comes from the DB&rsquo;s write-ahead log.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Correctness vs concurrency: locking and serialization cap throughput; higher isolation means more aborts and retries.</li>
          <li>Scope is one node/cluster — a transaction can&rsquo;t span services (use a <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">saga</Link>).</li>
          <li>Durability (fsync on commit) costs latency.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Assuming an eventually-consistent store gives ACID — it gives <Link href="/concepts/base" className="text-sky-400 hover:text-sky-300">BASE</Link>.</li>
          <li>Ignoring isolation levels and hitting anomalies (dirty/phantom reads) under concurrency.</li>
          <li>Treating a distributed multi-service operation as one transaction — use a <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">saga</Link> instead.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/base" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">BASE</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP</Link>
          <Link href="/concepts/saga" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Saga</Link>
        </p>
      </Section>
    </main>
  );
}
