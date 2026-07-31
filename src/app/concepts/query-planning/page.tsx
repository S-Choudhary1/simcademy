import Link from "next/link";
import type { Metadata } from "next";
import { QueryPlanningViz } from "@/concepts/QueryPlanningViz";

export const metadata: Metadata = {
  title: "Query Planning & Joins — Interactive Concept",
  description:
    "How a query is planned and executed, shown per database. Index types (B-tree/GIN/GiST vs compound/multikey/text/geo), the cost-based planner choosing a full scan vs an index scan, and join strategies (nested-loop, hash, merge vs $lookup) for PostgreSQL and MongoDB.",
  keywords: ["query planner", "EXPLAIN ANALYZE", "index scan vs seq scan", "COLLSCAN IXSCAN", "nested loop join", "hash join", "merge join", "$lookup", "PostgreSQL", "MongoDB", "index types", "GIN", "GiST"],
  alternates: { canonical: "/concepts/query-planning" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function QueryPlanningPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Query Planning &amp; Joins</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Query Planning &amp; Joins</h1>
        <p className="mt-2 text-slate-400">
          You write <em>what</em> you want; the database decides <em>how</em> to get it. Which index to use, whether to
          scan or seek, and how to join — shown side by side for PostgreSQL and MongoDB, because they differ.
        </p>
      </header>

      <Section title="The flow: parse → plan → execute">
        <p>
          A query goes through three stages. <strong>Parse</strong> turns the text into a tree. <strong>Plan</strong> is
          where the optimizer picks a strategy: which index (if any), a full scan versus an index scan, and — when more
          than one table is involved — a join algorithm. <strong>Execute</strong> runs the chosen plan and streams rows
          back. The interesting decisions all happen in <em>plan</em>, and they hinge on one thing: <strong>how many rows
          the query is expected to touch</strong>.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Switch between <strong>PostgreSQL</strong> and <strong>MongoDB</strong>, then explore the three tabs.{" "}
          <strong>Index types</strong> — pick a query pattern and see which index serves it. <strong>Planner</strong> —
          change the table size and how many rows match, and watch the planner flip between a full scan and an index
          scan. <strong>Joins</strong> — run a nested-loop, hash, or merge join (Postgres) or a <code>$lookup</code>{" "}
          (Mongo) and watch rows match step by step.
        </p>
        <QueryPlanningViz />
      </Section>

      <Section title="Index types differ by database">
        <p>
          <strong>PostgreSQL</strong> defaults to a <strong>B-tree</strong> (equality, range, sort, prefix) and adds
          specialized access methods: <strong>Hash</strong> for equality, <strong>GIN</strong> for arrays / jsonb /
          full-text, <strong>GiST</strong> for geometry and ranges, and <strong>BRIN</strong> for huge naturally-ordered
          tables.
        </p>
        <p>
          <strong>MongoDB</strong> indexes are B-trees too, but the flavors map to document shapes:{" "}
          <strong>single-field</strong> and <strong>compound</strong> (mind the <em>ESR</em> rule — Equality, Sort,
          Range — for column order), <strong>multikey</strong> (created automatically over array fields),{" "}
          <strong>text</strong>, <strong>2dsphere</strong> for geo, and <strong>hashed</strong> for shard-key
          distribution.
        </p>
      </Section>

      <Section title="Why a full scan can beat an index">
        <p>
          An index scan does a random I/O per matching row; a full scan does one sequential sweep. Below a few percent
          selectivity the index wins easily, but once a filter matches a large fraction of the table, the thousands of
          random lookups cost more than just reading everything once — so the planner picks the scan. Postgres puts a{" "}
          <strong>number</strong> on this via <code>EXPLAIN</code> (cost from <code>ANALYZE</code> statistics); MongoDB
          races candidate plans and you judge efficiency from{" "}
          <code>totalDocsExamined ÷ nReturned</code> (1:1 is perfect).
        </p>
      </Section>

      <Section title="Join strategies">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Nested loop</strong> — for each outer row, look up matches in the inner side. Cheap when the outer input is small and the inner is indexed.</li>
          <li><strong>Hash join</strong> — build a hash table on the smaller input, stream the larger and probe it. The workhorse for large, unsorted equi-joins.</li>
          <li><strong>Merge join</strong> — both inputs sorted on the key, advance two pointers in one pass. Great when the rows already arrive sorted (e.g. from an index).</li>
          <li><strong>MongoDB <code>$lookup</code></strong> — an (indexed) nested-loop join in the aggregation pipeline. Index the foreign field or it degrades to a scan per document; often you <strong>embed</strong> instead to avoid the join.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Assuming an index is always used — a low-selectivity filter, a function on the column, or a type mismatch silently forces a scan.</li>
          <li>Wrong composite / compound column order, so the query can&rsquo;t use the index (Postgres leftmost-prefix, Mongo ESR).</li>
          <li>A <code>$lookup</code> with no index on the foreign field — an O(n·m) join hiding in a pipeline.</li>
          <li>Never running <code>EXPLAIN</code> / <code>explain(&quot;executionStats&quot;)</code>, so you never see the plan actually chosen.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/postgresql-indexing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">PostgreSQL Indexing</Link>
          <Link href="/concepts/mongodb-indexing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">MongoDB Indexing</Link>
          <Link href="/technologies/postgresql" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">PostgreSQL</Link>
          <Link href="/technologies/mongodb" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">MongoDB</Link>
          <Link href="/comparisons/postgresql-vs-mongodb" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Postgres vs MongoDB</Link>
        </p>
      </Section>
    </main>
  );
}
