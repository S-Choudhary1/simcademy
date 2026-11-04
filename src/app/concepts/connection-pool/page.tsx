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
          Opening a database connection takes real work — a network handshake, often encryption setup, then login —
          and every database caps how many connections it will accept at once. A <strong>connection pool</strong>{" "}
          avoids repeating that work: it keeps a fixed set of connections already open. A request{" "}
          <strong>borrows</strong> one for the length of its query, then returns it to the pool. If every connection
          is busy, the request waits its turn.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Without a pool, a traffic spike opens thousands of new connections at once, and each one costs the database
          real memory and server-side resources — enough of them and the database falls over. A pool keeps the
          number of simultaneous connections <strong>bounded</strong> to a safe limit, and reuses them instead of
          paying the setup cost on every single request.
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
  max: 20,                        // pool size — how many connections can be open at once
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,  // give up waiting → fail fast with a clear error
});
const result = await pool.query("SELECT ...");   // borrow a connection → run the query → return it automatically
console.log(result.rows);

// PgBouncer (transaction pooling) lets thousands of app connections share a much
// smaller number of real database connections`}
        </pre>
        <p>
          A commonly cited starting point is pool size ≈ (CPU cores × 2) on the database server — but whatever number
          you land on, always keep it below the database&rsquo;s own <code>max_connections</code> setting.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reusing connections and capping concurrency protects the database — but once the pool is full, new requests queue up and can eventually time out instead of failing immediately.</li>
          <li>Too small a pool leaves the database underused while requests wait around for no reason; too large a pool can overwhelm the very database it was meant to protect.</li>
          <li>A pool can&rsquo;t fix slow queries — if a query itself is slow, no pool size makes up for it.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Holding a connection open while waiting on a slow external call (an API, a lock) — it&rsquo;s stuck and unavailable to everyone else the whole time.</li>
          <li>No timeout on acquiring a connection, so waiting requests pile up forever instead of failing fast with a clear error.</li>
          <li>Running one pool per app instance without doing the math — ten instances with a pool of 20 each can add up to 200 connections, quietly blowing past the database&rsquo;s limit.</li>
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
