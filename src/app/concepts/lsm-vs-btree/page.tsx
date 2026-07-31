import Link from "next/link";
import type { Metadata } from "next";
import { LsmBtreeViz } from "@/concepts/LsmBtreeViz";

export const metadata: Metadata = {
  title: "LSM-tree vs B-tree — Interactive Concept",
  description:
    "Two storage-engine designs compared: log-structured merge (LSM) trees that append writes to a memtable and flush immutable SSTables (write-optimized, Cassandra/RocksDB) versus B-trees that update leaf pages in place (read-optimized, PostgreSQL/InnoDB/WiredTiger).",
  keywords: ["LSM-tree", "B-tree", "storage engine", "SSTable", "memtable", "compaction", "write amplification", "Cassandra", "RocksDB", "PostgreSQL", "write-optimized", "read-optimized"],
  alternates: { canonical: "/concepts/lsm-vs-btree" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function LsmBtreePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">LSM-tree vs B-tree</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">LSM-tree vs B-tree</h1>
        <p className="mt-2 text-slate-400">
          The two families of storage engine behind almost every database — one tuned for writes, one for reads. The
          choice shapes how a database behaves under load.
        </p>
      </header>

      <Section title="Two philosophies">
        <p>
          A <strong>B-tree</strong> keeps every key in one sorted place and updates it <em>in place</em>: a write finds
          the leaf page and rewrites it (random I/O). An <strong>LSM-tree</strong> never updates in place — writes are
          <em> appended</em> to an in-memory <strong>memtable</strong> that is periodically flushed to an immutable
          <strong> SSTable</strong> on disk, and background <strong>compaction</strong> merges those files.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Write keys and watch them append to the LSM memtable (which flushes to SSTables when full) while the B-tree
          slots each into its leaf. Then read the oldest key: the LSM may scan the memtable plus several SSTables to find
          it, while the B-tree walks a single path.
        </p>
        <LsmBtreeViz />
      </Section>

      <Section title="The trade-off">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>LSM wins on writes</strong> — sequential appends absorb enormous write throughput, and there&rsquo;s no in-place page churn.</li>
          <li><strong>B-tree wins on reads</strong> — a key lives in exactly one place, so point and range reads take one path.</li>
          <li><strong>LSM read cost</strong> — a key may be spread across many SSTables; <strong>bloom filters</strong> (skip files that can&rsquo;t contain the key) and <strong>compaction</strong> keep it manageable, at the cost of extra background I/O and space.</li>
          <li><strong>B-tree write cost</strong> — random I/O plus a write-ahead log; updates cause write amplification.</li>
        </ul>
      </Section>

      <Section title="Who uses which">
        <p>
          <strong>LSM:</strong> Cassandra, ScyllaDB, RocksDB, LevelDB, HBase, and write-heavy time-series stores.{" "}
          <strong>B-tree:</strong> PostgreSQL, MySQL/InnoDB, and MongoDB&rsquo;s WiredTiger engine — see{" "}
          <Link href="/concepts/postgresql-indexing" className="text-sky-400 hover:text-sky-300">PostgreSQL indexing</Link>{" "}
          and <Link href="/concepts/mongodb-indexing" className="text-sky-400 hover:text-sky-300">MongoDB indexing</Link>,
          both B⁺-trees.
        </p>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/postgresql-indexing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">PostgreSQL Indexing</Link>
          <Link href="/concepts/mongodb-indexing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">MongoDB Indexing</Link>
          <Link href="/concepts/sharding" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Sharding</Link>
        </p>
      </Section>
    </main>
  );
}
