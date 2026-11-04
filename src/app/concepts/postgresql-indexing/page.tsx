import Link from "next/link";
import type { Metadata } from "next";
import { PostgresIndexViz } from "@/concepts/IndexExplorer";
import { PostgresIndexWriteViz } from "@/concepts/IndexWriteViz";
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
          Real rows in a table, a real index, and the difference one makes: searching an indexed column jumps straight
          to the row; searching an unindexed one reads the whole table.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A PostgreSQL table is stored as a <strong>heap</strong>: rows sit wherever they were inserted, addressed by
          a physical location called a <code>ctid</code>, like <code>(0,3)</code> — page 0, slot 3. An{" "}
          <strong>index</strong>{" "}is a separate, sorted structure that maps a column&rsquo;s values back to a{" "}
          <code>ctid</code>, so Postgres can jump straight to a row instead of checking every one. Below, the same
          ten users appear both ways — the heap on the left, an index on <code>email</code>{" "}on the right.
        </p>
        <p>
          Postgres names its default access method <code>btree</code>, but it&rsquo;s really a{" "}
          <strong>B⁺-tree</strong>{" "}(specifically the Lehman&ndash;Yao design): the upper levels hold only separator
          keys to guide the search, while every real entry (<code>value → ctid</code>) lives in a{" "}
          <strong>leaf</strong>{" "}page. Leaf pages are linked to their neighbors, which is what makes range scans and{" "}
          <code>ORDER BY</code>{" "}fast.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`CREATE INDEX idx_users_email ON users (email);   -- email is now indexed
-- city is NOT indexed`}</pre>
      </Section>

      <Section title="The problem it solves">
        <p>
          Without an index, Postgres has one way to answer a query: read every row in the table and keep the ones
          that match. That&rsquo;s instant on ten rows and expensive on ten million. An index trades a bit of extra
          storage and write work for the ability to jump directly to matching rows instead of reading the whole
          table.
        </p>
      </Section>

      <Section title="Try it — index scan vs sequential scan">
        <p>
          Search on <strong>email</strong>{" "}(indexed) and watch the query descend the B⁺-tree, land on a leaf, and
          follow the <code>ctid</code>{" "}pointer to fetch exactly one row. Then switch to <strong>city</strong>{" "}(no
          index): with nothing to seek, Postgres falls back to a <strong>Seq Scan</strong>{" "}and checks all ten rows.
          Notice we never search by <code>id</code>{" "}here — that&rsquo;s the primary key and always indexed
          automatically; the interesting comparison is a normal column with and without an index.
        </p>
        <PostgresIndexViz />
      </Section>

      <Section title="What a write does to the index">
        <p>
          Reads are only half the story. Every <code>INSERT</code>{" "}also has to slot the new value into the B⁺-tree
          in the right sorted position. The write walks down to the correct leaf and drops the key in. If that leaf
          is already full, it <strong>splits</strong>{" "}into two, and a copy of the middle key moves up to the parent —
          if the parent is also full, that split can cascade all the way to the root, making the tree one level
          taller.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`INSERT INTO users (email, city) VALUES ('zoe@acme.io', 'Rome');
-- the row lands in the heap AND idx_users_email is updated in the same transaction`}</pre>
        <PostgresIndexWriteViz />
        <p>
          This is why indexes make writes a little slower: each one is a second structure to keep in sync, and an
          unlucky insert can trigger a chain of splits. The payoff is that the tree stays shallow (its height grows
          only as <code>log(n)</code>), so reads stay fast no matter how large the table gets.
        </p>
      </Section>

      <Section title="How to read EXPLAIN">
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'eli@acme.io';
--  Index Scan using idx_users_email on users  (rows=1)   ← seek

EXPLAIN ANALYZE SELECT * FROM users WHERE city = 'Tokyo';
--  Seq Scan on users  (rows=3)                            ← reads every row`}</pre>
        <p>
          The plan node tells you which path actually ran. <strong>Index Scan</strong>{" "}means the B⁺-tree index was
          used; <strong>Seq Scan</strong>{" "}means Postgres read the whole heap. On ten rows the difference is
          invisible; on ten million it&rsquo;s the difference between a millisecond and a full-table sweep.
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          It&rsquo;s the index at the back of a textbook. Without it, finding every mention of a topic means flipping
          through every page (a Seq Scan). The index lists the topic once, sorted alphabetically, with the exact
          page numbers to jump to (an Index Scan) — at the cost of someone having to keep that index page up to date
          every time the book changes.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reads get much faster, but every <strong>INSERT / UPDATE / DELETE</strong>{" "}must also keep each index in sync.</li>
          <li>Indexes cost storage and memory — the more you add, the more write overhead you pay on every change.</li>
          <li>For a low-selectivity filter (a column with only a few distinct values, like a boolean flag), a Seq Scan can actually be cheaper — the planner decides based on estimated cost, not just whether an index exists.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Adding an index to every column &ldquo;just in case&rdquo; — each one slows down every write, whether or not a query ever uses it.</li>
          <li>Assuming a column with an index will always use it — on a low-selectivity column, Postgres may rightly prefer a Seq Scan.</li>
          <li>Never running <code>EXPLAIN ANALYZE</code>{" "}on a slow query — it&rsquo;s the only reliable way to see which plan Postgres actually chose.</li>
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
