import Link from "next/link";
import type { Metadata } from "next";
import { MongoIndexViz } from "@/concepts/IndexExplorer";
import { MongoIndexWriteViz } from "@/concepts/IndexWriteViz";

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
          Ten real documents in a collection, a real index, and the difference it makes: searching an indexed field is
          an <span className="whitespace-nowrap">IXSCAN</span>; searching an unindexed field is a full scan of every
          document, a COLLSCAN.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A MongoDB collection stores <strong>BSON documents</strong>{" "}(MongoDB&rsquo;s binary JSON-like format), each
          one addressed internally by a <strong>RecordId</strong>. An <strong>index</strong>{" "}is a separate, sorted
          structure that maps a field&rsquo;s values to a RecordId — so MongoDB can jump straight to a document
          instead of checking every one. Below are ten real user documents on the left and an index on{" "}
          <code>email</code>{" "}on the right.
        </p>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[14px]">
          <strong className="text-amber-300">Worth getting right:</strong>{" "}MongoDB&rsquo;s own docs call its indexes
          &ldquo;B-tree,&rdquo; which is why people often say <em>&ldquo;MongoDB uses a B-tree, Postgres uses a
          B+ tree.&rdquo;</em>{" "}That split is a myth. MongoDB&rsquo;s storage engine, <strong>WiredTiger</strong>,
          describes its own structure as one where &ldquo;internal pages only store keys and references&hellip; leaf
          pages store keys and values&rdquo; — that&rsquo;s the definition of a <strong>B⁺-tree</strong>. Both
          MongoDB and PostgreSQL use B⁺-trees under the hood; only the name they use for it differs.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`db.users.createIndex({ email: 1 })   // email is now indexed
// city is NOT indexed`}</pre>
      </Section>

      <Section title="The problem it solves">
        <p>
          Without an index, MongoDB has exactly one way to answer any query: check every document in the collection
          and keep the ones that match. That&rsquo;s fine for ten documents and painfully slow for ten million. An
          index trades a bit of extra storage and write work for the ability to jump straight to the matching
          documents instead of reading all of them.
        </p>
      </Section>

      <Section title="Try it — IXSCAN vs COLLSCAN">
        <p>
          Query on <strong>email</strong>{" "}(indexed): MongoDB walks down the B⁺-tree, finds the key, and follows its
          RecordId pointer straight to one document — an <strong>IXSCAN</strong>{" "}feeding a <strong>FETCH</strong>.
          Now query on <strong>city</strong>{" "}(no index): with nothing to search by, MongoDB falls back to a{" "}
          <strong>COLLSCAN</strong>, reading every document one by one. We deliberately don&rsquo;t query{" "}
          <code>_id</code>{" "}here — it&rsquo;s always indexed automatically; the interesting comparison is a normal
          field with an index versus one without.
        </p>
        <MongoIndexViz />
      </Section>

      <Section title="What a write does to the index">
        <p>
          Reads are only half the story. Every <code>insertOne</code>{" "}also has to slot the new value into the
          B⁺-tree in the right sorted position. The write walks down to the correct leaf page and drops the key in.
          If that leaf is already full, it <strong>splits</strong>{" "}into two, and a copy of the middle key moves up to
          the parent — if the parent is also full, that split can cascade all the way to the root, making the tree
          one level taller. WiredTiger uses the same B⁺-tree split logic PostgreSQL does.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`db.users.insertOne({ email: "zoe@acme.io", city: "Rome" })
// the document is written AND the { email: 1 } index is updated`}</pre>
        <MongoIndexWriteViz />
        <p>
          This is why indexes make writes a little slower: each one is a second structure to keep in sync, and an
          unlucky insert can trigger a chain of splits. The payoff is that the tree stays shallow (its height grows
          only as <code>log(n)</code>), so a lookup stays fast no matter how large the collection gets.
        </p>
      </Section>

      <Section title="How to read explain()">
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">{`db.users.find({ email: "eli@acme.io" }).explain("executionStats")
//  winningPlan: IXSCAN → FETCH
//  totalDocsExamined: 1,  nReturned: 1        ← 1:1, ideal

db.users.find({ city: "Tokyo" }).explain("executionStats")
//  winningPlan: COLLSCAN
//  totalDocsExamined: 10, nReturned: 3        ← scanned everything`}</pre>
        <p>
          The number to watch is <code>totalDocsExamined ÷ nReturned</code>: how many documents MongoDB had to look
          at versus how many it actually returned. A good index pushes that ratio toward <strong>1:1</strong> — you
          only touched the documents you wanted. A COLLSCAN examines the entire collection no matter how few
          documents match.
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          It&rsquo;s the index at the back of a textbook. Without it, finding every mention of a topic means flipping
          through every page (a COLLSCAN). The index lists the topic once, sorted alphabetically, with the exact page
          numbers to jump to (an IXSCAN) — at the cost of someone having to keep that index page up to date every
          time the book changes.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Faster reads, but every <strong>insert / update</strong>{" "}has to maintain each index, and indexes consume RAM (your working set should fit in memory for them to stay fast).</li>
          <li>Compound indexes (indexes on more than one field) follow the <strong>ESR rule</strong> — Equality fields first, then Sort, then Range — for the best field order.</li>
          <li>Array fields automatically become <strong>multikey</strong>{" "}indexes; a poorly-chosen index still leaves a COLLSCAN in the plan.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Adding an index to every field &ldquo;just in case&rdquo; — each one slows down writes and uses memory, whether or not it&rsquo;s ever used by a query.</li>
          <li>Getting the field order wrong on a compound index (not following the ESR rule), so queries that should use it fall back to a COLLSCAN instead.</li>
          <li>Never running <code>explain(&quot;executionStats&quot;)</code>{" "}on a slow query — it&rsquo;s the only way to see whether MongoDB actually used the index you expected.</li>
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
