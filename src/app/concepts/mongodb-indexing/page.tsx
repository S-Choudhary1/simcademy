import Link from "next/link";
import type { Metadata } from "next";
import { MongoIndexViz } from "@/concepts/IndexExplorer";

export const metadata: Metadata = {
  title: "MongoDB Indexing — Interactive Concept",
  description:
    "How a MongoDB index really works, over ten real documents: the collection, a B-tree index on email with RecordId pointers, and the difference between an IXSCAN (query an indexed field) and a COLLSCAN (query a field with no index).",
  keywords: ["MongoDB index", "B-tree", "B+ tree", "WiredTiger", "IXSCAN", "COLLSCAN", "RecordId", "createIndex", "explain executionStats", "totalDocsExamined", "query performance"],
  alternates: { canonical: "/concepts/mongodb-indexing" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function MongoIndexingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">MongoDB Indexing</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">Concept · MongoDB</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">MongoDB Indexing</h1>
        <p className="mt-2 text-slate-400">
          Ten real documents in a collection, a real B⁺-tree index, and the difference it makes: an indexed field is an
          <span className="whitespace-nowrap"> IXSCAN</span>; an unindexed field is a full COLLSCAN of every document.
        </p>
      </header>

      <Section title="Collection + index, side by side">
        <p>
          A MongoDB collection stores <strong>BSON documents</strong>, each addressed internally by a{" "}
          <strong>RecordId</strong>. An <strong>index</strong> is a separate sorted structure that maps a field&rsquo;s
          values to a RecordId. Below are ten real user documents on the left and the index on <code>email</code> on the
          right.
        </p>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[14px]">
          <strong className="text-amber-300">Worth getting right:</strong> MongoDB&rsquo;s docs call its indexes
          &ldquo;B-tree,&rdquo; so people often say <em>&ldquo;MongoDB uses a B-tree, Postgres uses a B+ tree.&rdquo;</em>{" "}
          That split is a myth. MongoDB&rsquo;s storage engine, <strong>WiredTiger</strong>, states plainly that
          &ldquo;internal pages only store keys and references&hellip; leaf pages store keys and values&rdquo; — that is
          a <strong>B⁺-tree</strong>. So both MongoDB and PostgreSQL use B⁺-trees; only the <em>naming</em> differs.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`db.users.createIndex({ email: 1 })   // email is now indexed
// city is NOT indexed`}</pre>
      </Section>

      <Section title="Try it — IXSCAN vs COLLSCAN">
        <p>
          Query on <strong>email</strong> (indexed): the search descends the B⁺-tree, finds the key, and follows the
          RecordId to fetch one document — an <strong>IXSCAN</strong> feeding a <strong>FETCH</strong>. Then query on{" "}
          <strong>city</strong> (no index): MongoDB does a <strong>COLLSCAN</strong>, reading every document. We
          deliberately don&rsquo;t query <code>_id</code> — it&rsquo;s always indexed; the useful comparison is a regular
          field with and without an index.
        </p>
        <MongoIndexViz />
      </Section>

      <Section title="How to read explain()">
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`db.users.find({ email: "eli@acme.io" }).explain("executionStats")
//  winningPlan: IXSCAN → FETCH
//  totalDocsExamined: 1,  nReturned: 1        ← 1:1, ideal

db.users.find({ city: "Tokyo" }).explain("executionStats")
//  winningPlan: COLLSCAN
//  totalDocsExamined: 10, nReturned: 3        ← scanned everything`}</pre>
        <p>
          The number to watch is <code>totalDocsExamined ÷ nReturned</code>. An index drives it toward <strong>1:1</strong>
          (you touched only the documents you returned); a COLLSCAN examines the whole collection regardless of how few
          match.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Faster reads, but every <strong>insert / update</strong> maintains each index, and indexes consume RAM (the working set should fit in memory).</li>
          <li>Compound indexes follow the <strong>ESR rule</strong> — Equality, Sort, Range — for field order.</li>
          <li>Array fields become <strong>multikey</strong> indexes automatically; a poorly-chosen index still leaves a COLLSCAN in the plan.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/postgresql-indexing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">PostgreSQL Indexing</Link>
          <Link href="/concepts/query-planning" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Query Planning &amp; Joins</Link>
          <Link href="/technologies/mongodb" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">MongoDB</Link>
        </p>
      </Section>
    </main>
  );
}
