import Link from "next/link";
import type { Metadata } from "next";
import { IsolationViz } from "@/concepts/IsolationViz";

export const metadata: Metadata = {
  title: "Isolation Levels & MVCC — Interactive Concept",
  description:
    "Transaction isolation levels visualized: dirty reads, non-repeatable reads, and phantom reads, and which of Read Uncommitted / Read Committed / Repeatable Read / Serializable each one allows. How MVCC snapshots prevent them.",
  keywords: ["isolation levels", "MVCC", "dirty read", "non-repeatable read", "phantom read", "read committed", "repeatable read", "serializable", "snapshot isolation", "PostgreSQL", "ACID isolation"],
  alternates: { canonical: "/concepts/isolation-levels" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function IsolationPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Isolation Levels &amp; MVCC</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Isolation Levels &amp; MVCC</h1>
        <p className="mt-2 text-slate-400">
          The &ldquo;I&rdquo; in ACID is a dial, not a switch. Each isolation level trades away some anomalies for more
          concurrency — and MVCC is how modern databases give you strong reads without blocking writers.
        </p>
      </header>

      <Section title="The three read anomalies">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Dirty read</strong> — you read another transaction&rsquo;s <em>uncommitted</em> change, which may then roll back.</li>
          <li><strong>Non-repeatable read</strong> — you read a row twice and get different values, because someone committed an update in between.</li>
          <li><strong>Phantom read</strong> — you run the same range query twice and new rows appear, because someone committed an insert matching your predicate.</li>
        </ul>
      </Section>

      <Section title="Try it">
        <p>
          Choose an isolation level and an anomaly, then run the two-transaction interleaving. The matrix shows what the
          current level prevents (✓) versus allows (✗). Notice that at <strong>Repeatable Read</strong> and{" "}
          <strong>Serializable</strong> the reader works from an <strong>MVCC snapshot</strong> taken when its
          transaction began, so concurrent commits are simply invisible to it.
        </p>
        <IsolationViz />
      </Section>

      <Section title="What MVCC does">
        <p>
          <strong>Multi-Version Concurrency Control</strong> keeps multiple versions of each row. A writer creates a new
          version instead of overwriting; each transaction reads the version that was visible at its <em>snapshot</em>.
          The payoff: <strong>readers never block writers and writers never block readers</strong>. &ldquo;Repeatable
          Read&rdquo; is really just &ldquo;every read uses the snapshot from my first statement.&rdquo;
        </p>
      </Section>

      <Section title="PostgreSQL specifics (worth knowing)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Postgres has <strong>no dirty reads at all</strong> — asking for <code>READ UNCOMMITTED</code> silently gives you <code>READ COMMITTED</code>.</li>
          <li>Postgres <strong>Repeatable Read</strong> uses snapshot isolation and also <strong>prevents phantoms</strong> — stronger than the SQL standard, which allows them (the matrix above follows the standard).</li>
          <li>Postgres <strong>Serializable</strong> (SSI) additionally catches write-skew; it may abort a transaction with a serialization error you must retry.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/acid" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">ACID</Link>
          <Link href="/concepts/locking" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Locking &amp; Concurrency</Link>
          <Link href="/technologies/postgresql" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">PostgreSQL</Link>
        </p>
      </Section>
    </main>
  );
}
