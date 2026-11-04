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
          You write <em>what</em>{" "}data you want; the database decides <em>how</em>{" "}to go get it — which index to use,
          whether to scan or seek, and how to join. Shown side by side for PostgreSQL and MongoDB, because they
          decide this differently.
        </p>
      </header>

      <Section title="The flow: parse → plan → execute">
        <p>
          Every query goes through three stages. <strong>Parse</strong>{" "}turns your query text into a structure the
          database can work with. <strong>Plan</strong>{" "}is where the optimizer decides the strategy: which index (if
          any) to use, whether to scan the whole table or seek with an index, and — if more than one table or
          collection is involved — which join algorithm to run. <strong>Execute</strong>{" "}then runs that chosen plan
          and streams the results back to you.
        </p>
        <p>
          Almost all the interesting decisions happen in the <em>plan</em>{" "}stage, and they come down to one question:{" "}
          <strong>how many rows (or documents) is this query expected to touch?</strong>
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          It&rsquo;s a GPS app. You type in a destination (your query) and the app decides the actual route (the
          plan) — a quick residential shortcut if traffic is light, or the highway if it isn&rsquo;t. You never
          choose the turn-by-turn directions yourself; the planner picks them based on current conditions, the same
          way a database planner picks a scan or an index based on how much data is involved.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Switch between <strong>PostgreSQL</strong>{" "}and <strong>MongoDB</strong>, then explore the three tabs.{" "}
          <strong>Index types</strong> — pick a query pattern and see which index would serve it.{" "}
          <strong>Planner</strong> — change the table size and how many rows match, and watch the planner flip
          between a full scan and an index scan. <strong>Joins</strong> — run a nested-loop, hash, or merge join
          (Postgres) or a <code>$lookup</code>{" "}(Mongo) and watch rows match up step by step.
        </p>
        <QueryPlanningViz />
      </Section>

      <Section title="Index types differ by database">
        <p>
          <strong>PostgreSQL</strong>{" "}defaults to a <strong>B-tree</strong>{" "}index (good for equality, range, sort,
          and prefix searches — technically a B⁺-tree, see{" "}
          <Link href="/concepts/postgresql-indexing" className="text-sky-400 hover:text-sky-300">PostgreSQL indexing</Link>)
          and adds specialized types on top: <strong>Hash</strong>{" "}for plain equality, <strong>GIN</strong>{" "}for
          arrays, jsonb, and full-text search, <strong>GiST</strong>{" "}for geometry and ranges, and{" "}
          <strong>BRIN</strong>{" "}for huge, naturally-ordered tables (like an events table sorted by time).
        </p>
        <p>
          <strong>MongoDB</strong>{" "}indexes are built on the same underlying B⁺-tree structure (see{" "}
          <Link href="/concepts/mongodb-indexing" className="text-sky-400 hover:text-sky-300">MongoDB indexing</Link>{" "}
          for why &ldquo;B-tree vs B+ tree&rdquo; is a common mix-up), but the index <em>types</em>{" "}map to different
          document shapes: <strong>single-field</strong>{" "}and <strong>compound</strong>{" "}(follow the <em>ESR</em>{" "}rule
          — Equality, Sort, Range — for field order), <strong>multikey</strong>{" "}(created automatically over array
          fields), <strong>text</strong>{" "}for full-text search, <strong>2dsphere</strong>{" "}for geo queries, and{" "}
          <strong>hashed</strong>{" "}for spreading data evenly across shards.
        </p>
      </Section>

      <Section title="Why a full scan can beat an index">
        <p>
          An index scan does one random disk lookup per matching row. A full scan does one sequential sweep over
          everything. When only a small slice of the table matches your filter, the index wins easily. But once a
          filter matches a large fraction of the table, doing thousands of individual random lookups ends up costing
          more than just reading everything once — so the planner switches to a full scan instead.
        </p>
        <p>
          Postgres puts an actual number on this trade-off via <code>EXPLAIN</code>{" "}(using statistics gathered by{" "}
          <code>ANALYZE</code>). MongoDB takes a more empirical approach: when more than one plan looks viable, it
          runs several candidate plans for a short trial period and keeps whichever wins, then caches that choice.
          Either way, you can judge how well it worked from <code>totalDocsExamined ÷ nReturned</code> — the closer
          to <strong>1:1</strong>, the better.
        </p>
      </Section>

      <Section title="Join strategies">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Nested loop</strong> — for each row on one side, look up matches on the other. Cheap when the outer side is small and the inner side is indexed.</li>
          <li><strong>Hash join</strong> — build a hash table from the smaller input, then stream the larger input and probe it. The default workhorse for large, unsorted equality joins.</li>
          <li><strong>Merge join</strong> — walk two inputs that are already sorted on the join key, advancing two pointers together in one pass. Great when the rows already arrive sorted, e.g. from an index.</li>
          <li><strong>MongoDB <code>$lookup</code></strong> — effectively a nested-loop join inside the aggregation pipeline. Index the foreign field, or it degrades into a full scan per input document; often it&rsquo;s simpler to <strong>embed</strong>{" "}the related data instead of joining at all.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Assuming an index is always used — a low-selectivity filter, a function wrapped around the column, or a type mismatch can silently force a full scan instead.</li>
          <li>Getting compound/composite column order wrong, so the query can&rsquo;t use the index at all (Postgres: leftmost-prefix rule; Mongo: the ESR rule).</li>
          <li>Running a <code>$lookup</code>{" "}with no index on the foreign field — an accidental O(n·m) join hiding inside an aggregation pipeline.</li>
          <li>Never running <code>EXPLAIN</code>{" "}or <code>explain(&quot;executionStats&quot;)</code>, so you never actually see which plan the database chose.</li>
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
