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

      <Section title="Definition">
        <p>
          <strong>Isolation</strong>{" "}controls how much of one transaction&rsquo;s in-progress work another
          transaction running at the same time is allowed to see. The SQL standard defines four levels, from loosest
          to strictest: <strong>Read Uncommitted</strong>, <strong>Read Committed</strong>, <strong>Repeatable
          Read</strong>, and <strong>Serializable</strong>. Each stricter level rules out more of the three read
          anomalies below, in exchange for allowing less concurrency.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          If every transaction ran one at a time, there would be no isolation problem at all — but that&rsquo;s far
          too slow for any system with real traffic. Isolation levels are the trade-off dial: how much are
          transactions allowed to overlap in time before one transaction&rsquo;s half-finished work starts leaking
          into what another transaction sees?
        </p>
      </Section>

      <Section title="The three read anomalies">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Dirty read</strong> — you read another transaction&rsquo;s <em>uncommitted</em>{" "}change, which may then roll back.</li>
          <li><strong>Non-repeatable read</strong> — you read a row twice and get different values, because someone committed an update in between.</li>
          <li><strong>Phantom read</strong> — you run the same range query twice and new rows appear, because someone committed an insert matching your predicate.</li>
        </ul>
      </Section>

      <Section title="Try it">
        <p>
          Choose an isolation level and an anomaly, then run the two-transaction interleaving. The matrix shows what the
          current level prevents (✓) versus allows (✗). Notice that at <strong>Repeatable Read</strong>{" "}and{" "}
          <strong>Serializable</strong>{" "}the reader works from an <strong>MVCC snapshot</strong>{" "}taken when its
          transaction began, so concurrent commits are simply invisible to it.
        </p>
        <IsolationViz />
      </Section>

      <Section title="Analogy">
        <p>
          Picture two bank tellers sharing one ledger book. If teller A is allowed to read an entry teller B is still
          in the middle of writing — not yet finalised — that&rsquo;s a dirty read. If teller A checks a
          customer&rsquo;s balance, helps someone else, then checks the same balance again and gets a different
          number because teller B finished an update in between, that&rsquo;s a non-repeatable read. If teller A
          counts how many accounts hold over $1,000, helps someone else, then re-counts and finds a brand-new account
          pushed the count up, that&rsquo;s a phantom read. Isolation levels are the house rules for how much the
          tellers are allowed to interrupt and peek at each other&rsquo;s half-finished work.
        </p>
      </Section>

      <Section title="What MVCC does">
        <p>
          <strong>Multi-Version Concurrency Control</strong>{" "}keeps multiple versions of each row. A writer creates a new
          version instead of overwriting; each transaction reads the version that was visible at its <em>snapshot</em>.
          The payoff: <strong>readers never block writers and writers never block readers</strong>. &ldquo;Repeatable
          Read&rdquo; is really just &ldquo;every read uses the snapshot from my first statement.&rdquo;
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Every relational database lets you set a transaction&rsquo;s isolation level, typically with{" "}
          <code>SET TRANSACTION ISOLATION LEVEL ...</code>{" "}at the start of a transaction. Defaults differ:
          PostgreSQL and SQL Server default to Read Committed; MySQL&rsquo;s InnoDB engine defaults to Repeatable
          Read. Oracle only offers Read Committed (its default) and Serializable — it has no separate Repeatable Read
          level.
        </p>
      </Section>

      <Section title="PostgreSQL specifics (worth knowing)">
        <ul className="list-disc space-y-1 pl-5">
          <li>PostgreSQL has <strong>no dirty reads at all</strong> — asking for <code>READ UNCOMMITTED</code>{" "}silently gives you <code>READ COMMITTED</code>{" "}instead.</li>
          <li>PostgreSQL&rsquo;s <strong>Repeatable Read</strong>{" "}uses snapshot isolation and also <strong>blocks phantom reads</strong> — stricter than the SQL standard requires (the standard allows phantoms at Repeatable Read; the matrix above follows the standard, not Postgres).</li>
          <li>PostgreSQL&rsquo;s <strong>Serializable</strong>{" "}level (built with SSI, Serializable Snapshot Isolation) also catches write skew, a subtler anomaly beyond the three above. It may abort your transaction with a serialization error — when that happens, the fix is to retry the whole transaction, not treat it as a bug.</li>
        </ul>
      </Section>

      <Section title="How to implement">
        <p>Set the level per transaction — avoid changing the database-wide default unless you have a strong reason to:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ... do the work ...
COMMIT;`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Default to Read Committed unless you have a specific reason not to — it&rsquo;s what Postgres and SQL Server use out of the box, and it&rsquo;s enough for most everyday queries.</li>
          <li>Reach for Repeatable Read or Serializable when a transaction needs a consistent view across multiple statements — for example, generating a report, or a read-then-write that must not race with a concurrent change.</li>
          <li>At Serializable, your code must be ready to catch a serialization-failure error and retry the whole transaction — the database is explicitly allowed to abort you rather than let an anomaly slip through.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Stricter levels remove more anomalies but can increase blocking or force retries — Serializable in particular can abort transactions that Read Committed would have let through untouched.</li>
          <li>MVCC-based databases let strict reads avoid blocking writers entirely, but that costs storage and background cleanup (Postgres calls this <code>VACUUM</code>) to remove old row versions no one needs anymore.</li>
          <li>Picking a level stricter than you need wastes throughput for no benefit; picking one looser than you need risks subtle bugs that only show up under real concurrent load — which makes them painful to reproduce.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Assuming the common default, Read Committed, protects you from everything — non-repeatable reads and phantom reads are both still possible at that level.</li>
          <li>Assuming every database follows the SQL standard&rsquo;s exact rules — PostgreSQL&rsquo;s Repeatable Read, for instance, is stricter than the standard requires (it also blocks phantoms).</li>
          <li>Treating a Serializable transaction&rsquo;s failure as a bug instead of an expected outcome — the correct response is to retry the transaction, not to panic or disable Serializable entirely.</li>
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
