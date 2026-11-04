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
          The guarantees a database makes about a transaction: Atomicity, Consistency, Isolation, Durability.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A <strong>transaction</strong>{" "}bundles several database operations so they succeed or fail together, as one
          unit. ACID is four guarantees about that unit:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Atomicity</strong>: all the operations happen, or none of them do — never a half-finished state.</li>
          <li><strong>Consistency</strong>: the database only ever moves between valid states — it never breaks rules you&rsquo;ve defined, like a required field or a foreign key.</li>
          <li><strong>Isolation</strong>: transactions running at the same time don&rsquo;t see each other&rsquo;s half-finished work.</li>
          <li><strong>Durability</strong>: once a transaction is confirmed (&ldquo;committed&rdquo;), it survives a crash right after — the data is safely on disk.</li>
        </ul>
      </Section>

      <Section title="The problem it solves">
        <p>
          Without transactions, a crash between two writes can leave the system in a broken, half-done state — for
          example, money taken out of one account but never added to the other. ACID guarantees that specific
          failure can&rsquo;t happen: either both writes land, or neither does.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Transfer $100 from account A to account B, with a crash injected part-way through. Without a transaction,
          the money disappears — debited from A but never credited to B, breaking the invariant that A + B should
          stay the same. With ACID, the whole transfer rolls back as if it never started.
        </p>
        <AcidViz />
      </Section>

      <Section title="Analogy">
        <p>
          A wire transfer at a bank. You would never accept &ldquo;we took it out of your account but it never
          arrived&rdquo; — the transfer either happens completely, or not at all.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Relational databases (<Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link>,
          MySQL, SQL Server) provide full ACID. Document stores like{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link>{" "}give ACID within
          a single document and, more recently, across multi-document transactions too.
        </p>
      </Section>

      <Section title="How to implement">
        <p>Wrap the operations in a transaction and let the database enforce all four properties for you:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
  UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;   -- or ROLLBACK on any error`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Pick an isolation level: many databases (e.g. PostgreSQL) default to <code>READ COMMITTED</code>, and you can go stricter — up to <code>SERIALIZABLE</code> — when you need it. Defaults vary by database, so check yours.</li>
          <li>Keep transactions short, since locks are usually held for the whole duration. Durability itself comes from the database&rsquo;s write-ahead log, not from anything extra you have to write.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Correctness vs concurrency: locking and strict isolation protect correctness but cap how many transactions can run at once, and stricter isolation means more aborts and retries.</li>
          <li>Scope is one database (or cluster) — a transaction can&rsquo;t safely span separate services (use a <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">saga</Link>{" "}for that).</li>
          <li>Durability requires an fsync (a guaranteed disk write) on commit, which costs some latency.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Assuming an eventually-consistent store (common in NoSQL) gives you ACID guarantees — it typically gives you <Link href="/concepts/base" className="text-sky-400 hover:text-sky-300">BASE</Link>{" "}instead.</li>
          <li>Ignoring isolation levels and then hitting anomalies (dirty reads, phantom reads) under concurrency.</li>
          <li>Treating an operation that spans multiple services as one transaction — use a <Link href="/concepts/saga" className="text-sky-400 hover:text-sky-300">saga</Link>{" "}instead.</li>
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
