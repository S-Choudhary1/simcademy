import Link from "next/link";
import type { Metadata } from "next";
import { ConnectionPoolViz } from "@/concepts/ConnectionPoolViz";

export const metadata: Metadata = {
  title: "Connection Pooling — Interactive Concept",
  description:
    "Database connection pooling explained with a live simulation: requests borrow a fixed set of connections, queue when the pool is exhausted, and time out under overload. Covers pool sizing, PgBouncer, and trade-offs.",
  keywords: ["connection pool", "connection pooling", "PgBouncer", "pool exhaustion", "database connections", "max connections"],
  alternates: { canonical: "/concepts/connection-pool" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function ConnectionPoolPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Connection Pooling</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Connection Pooling</h1>
        <p className="mt-2 text-slate-400">
          Reuse a small, fixed set of database connections instead of opening one per request.
        </p>
      </header>

      <Section title="Definition">
        <p>
          Opening a database connection is expensive (TCP + TLS + auth), and databases cap how many they&rsquo;ll
          accept. A <strong>connection pool</strong> keeps a fixed set of open connections; a request{" "}
          <strong>borrows</strong> one for the duration of its query and returns it. If all are busy, the request
          waits.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Without a pool, a traffic spike opens thousands of connections and the database falls over (each connection
          costs memory and a backend process). The pool <strong>bounds concurrency</strong> to a safe number and
          amortises the cost of connecting.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Push the request rate above what the pool can serve (pool size ÷ query time) and watch the waiting queue
          fill and requests time out — <strong>pool exhaustion</strong>. Raise the pool to drain it; note that a bigger
          pool just pushes the load onto the database.
        </p>
        <ConnectionPoolViz />
      </Section>

      <Section title="Analogy">
        <p>
          A pool of shared meeting rooms. Instead of building a new room per meeting, staff book one of a fixed set,
          use it, and hand it back. When they&rsquo;re all booked, you wait — and if you wait too long, you give up.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Every app talking to a database: an in-process pool (HikariCP, <code>node-postgres</code> Pool) and often a
          separate pooler like <strong>PgBouncer</strong> in front of{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link>, which is
          essential for serverless where each function instance would otherwise open its own connections.
        </p>
      </Section>

      <Section title="How to implement">
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// node-postgres
const pool = new Pool({
  max: 20,                 // pool size — bound concurrency to what the DB can take
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,   // give up waiting → surface a clear error
});
const rows = await pool.query("SELECT ...");   // borrow → run → auto-return

// PgBouncer (transaction pooling) lets thousands of clients share a few DB conns`}
        </pre>
        <p>Size it roughly as: pool ≈ cores × 2 for the DB, and never larger than the DB&rsquo;s <code>max_connections</code>.</p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Bounds concurrency and reuses connections — but under overload requests queue and eventually time out.</li>
          <li>Too small → underutilised DB and needless waiting; too large → you overwhelm the database you were protecting.</li>
          <li>A pool hides the real bottleneck: if queries are slow, no pool size saves you.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Holding a connection across a slow external call — it&rsquo;s unavailable to everyone else the whole time.</li>
          <li>No acquire timeout, so requests pile up forever instead of failing fast.</li>
          <li>Per-instance pools × many instances silently exceeding the DB&rsquo;s connection limit.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/technologies/postgresql" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">PostgreSQL</Link>
          <Link href="/concepts/rate-limiting" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Rate Limiting</Link>
          <Link href="/concepts/circuit-breaker" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Circuit Breaker</Link>
        </p>
      </Section>
    </main>
  );
}
