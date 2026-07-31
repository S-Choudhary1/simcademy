import Link from "next/link";
import type { Metadata } from "next";
import { PostgresIndexViz } from "@/concepts/IndexExplorer";
import { TopicMeme } from "@/components/memes";

export const metadata: Metadata = {
  title: "PostgreSQL Indexing — Interactive Concept",
  description:
    "How a PostgreSQL index really works, over real rows: the heap table, a B-tree index on email with ctid pointers, and the difference between an Index Scan (search an indexed column) and a Seq Scan (search a column with no index).",
  keywords: ["PostgreSQL index", "B-tree", "B+ tree", "Lehman-Yao", "ctid", "heap", "Index Scan", "Seq Scan", "EXPLAIN", "CREATE INDEX", "query performance"],
  alternates: { canonical: "/concepts/postgresql-indexing" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function PostgresIndexingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">PostgreSQL Indexing</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">Concept · PostgreSQL</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">PostgreSQL Indexing</h1>
        <p className="mt-2 text-slate-400">
          Real rows in a heap, a real B⁺-tree index, and the difference one makes: searching an indexed column jumps
          straight to the row; searching an unindexed one reads the whole table.
        </p>
      </header>

      <Section title="Heap + index, side by side">
        <p>
          A PostgreSQL table is a <strong>heap</strong>: rows sit in insertion order, addressed by a physical{" "}
          <code>ctid</code> like <code>(0,3)</code> (page 0, slot 3). An <strong>index</strong> is a separate sorted
          structure that maps a column&rsquo;s values back to a <code>ctid</code>. Below, the same ten users appear both
          ways — the heap on the left, the index on <code>email</code> on the right.
        </p>
        <p>
          Postgres names the default access method <code>btree</code>, but it is really a <strong>B⁺-tree</strong> (the
          Lehman&ndash;Yao design): upper pages hold only separator keys to route the search, <em>every</em> real entry
          (<code>value → ctid</code>) lives in a <strong>leaf</strong> page, and leaf pages are linked to their siblings
          — which is what makes range scans and <code>ORDER BY</code> fast.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`CREATE INDEX idx_users_email ON users (email);   -- email is now indexed
-- city is NOT indexed`}</pre>
      </Section>

      <Section title="Try it — index scan vs sequential scan">
        <p>
          Search on <strong>email</strong> (indexed) and watch the query descend the B⁺-tree, land on a leaf, and follow
          the <code>ctid</code> pointer to fetch exactly one row. Then switch to <strong>city</strong> (no index): with
          nothing to seek, Postgres falls back to a <strong>Seq Scan</strong> and checks all ten rows. Notice we never
          search by <code>id</code> — that&rsquo;s the primary key and always indexed; the interesting comparison is a
          normal column with and without an index.
        </p>
        <PostgresIndexViz />
      </Section>

      <Section title="How to read EXPLAIN">
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'eli@acme.io';
--  Index Scan using idx_users_email on users  (rows=1)   ← seek

EXPLAIN ANALYZE SELECT * FROM users WHERE city = 'Tokyo';
--  Seq Scan on users  (rows=3)                            ← reads every row`}</pre>
        <p>
          The plan node tells you which path ran. <strong>Index Scan</strong> means the B⁺-tree index was used;{" "}
          <strong>Seq Scan</strong> means it read the whole heap. On ten rows the difference is invisible; on ten
          million it&rsquo;s the difference between a millisecond and a full-table sweep.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reads get much faster, but every <strong>INSERT / UPDATE / DELETE</strong> must also maintain each index.</li>
          <li>Indexes cost storage and memory; more indexes, more write overhead.</li>
          <li>Low-selectivity filters (a column with few distinct values) may be cheaper as a Seq Scan — the planner decides by cost.</li>
        </ul>
      </Section>

      <div className="mt-8"><TopicMeme topic="indexing" /></div>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/mongodb-indexing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">MongoDB Indexing</Link>
          <Link href="/concepts/query-planning" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Query Planning &amp; Joins</Link>
          <Link href="/technologies/postgresql" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">PostgreSQL</Link>
        </p>
      </Section>
    </main>
  );
}
