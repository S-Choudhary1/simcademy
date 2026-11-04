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
          Two very different designs for how a database stores data on disk — one optimized for writing fast, one for
          reading fast. Which one your database uses changes how it behaves under heavy load.
        </p>
      </header>

      <Section title="Definition">
        <p>
          Every database has to decide how it stores and finds data on disk. There are two popular designs.
        </p>
        <p>
          A <strong>B-tree</strong> keeps every key in one sorted structure and updates it <em>in place</em>: when you
          write a value, the database finds the exact page on disk and rewrites it right there.
        </p>
        <p>
          An <strong>LSM-tree</strong> (Log-Structured Merge-tree) never updates in place. Every write is{" "}
          <em>appended</em> to a small in-memory structure called a <strong>memtable</strong>. Once that fills up, it&rsquo;s
          flushed to disk as a new, unchangeable file called an <strong>SSTable</strong>. A background process called{" "}
          <strong>compaction</strong> later merges old SSTables together and discards outdated values.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          Both designs solve the same problem — store data so you can find it again quickly — but they make opposite
          bets. A B-tree bets you&rsquo;ll read far more than you write, so it keeps everything in one tidy, searchable
          place even if that makes each write a little more expensive. An LSM-tree bets you&rsquo;re writing constantly,
          so it makes writes nearly free (just append) and pays the cost later, in the background, when it reads or
          compacts.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Write some keys and watch them land in the LSM <strong>memtable</strong>, which flushes to a new SSTable once
          it&rsquo;s full, while the B-tree slots each key straight into its sorted leaf. Now read the oldest key you
          wrote: the LSM-tree may have to check the memtable and several SSTables before finding it, while the B-tree
          just walks one path straight to the answer.
        </p>
        <LsmBtreeViz />
      </Section>

      <Section title="Analogy">
        <p>
          Think about organizing a bookshelf. A B-tree is like keeping every book in its exact alphabetical spot —
          looking any book up is instant, but adding one sometimes means shifting several neighbors over to make
          room. An LSM-tree is like dropping new books onto the top of a pile as they arrive, and only alphabetizing
          in batches later, overnight. Adding a book is instant; finding one means checking the pile first, then the
          alphabetized shelves.
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>LSM-trees are faster to write to</strong> — appending in memory, then sequentially to disk, is about as cheap as writing gets, since there&rsquo;s no existing page to find and rewrite.</li>
          <li><strong>B-trees are faster to read from</strong> — a key lives in exactly one place, so both a single lookup and a range of keys take one direct path.</li>
          <li><strong>LSM-tree reads pay a cost</strong>: a key could be sitting in the memtable or in any of several SSTables. <strong>Bloom filters</strong> (a small structure that quickly rules out files that definitely don&rsquo;t contain a key) and background compaction keep this manageable, at the cost of extra disk I/O and space while compaction runs.</li>
          <li><strong>B-tree writes pay a cost too</strong>: updating a page in place is random I/O, and the database still needs a write-ahead log for crash recovery. Frequent small updates to the same page cause <strong>write amplification</strong> — more bytes get written to disk than the size of your actual change.</li>
        </ul>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          <strong>LSM-tree:</strong> Cassandra, ScyllaDB, RocksDB, LevelDB, HBase, and most write-heavy time-series
          databases. <strong>B-tree family:</strong> PostgreSQL, MySQL/InnoDB, and MongoDB&rsquo;s WiredTiger engine.
          In practice, almost all of these specifically implement the <strong>B⁺-tree</strong> variant — values live
          only in linked leaf pages, never in the upper levels — see{" "}
          <Link href="/concepts/postgresql-indexing" className="text-sky-400 hover:text-sky-300">PostgreSQL indexing</Link>{" "}
          and <Link href="/concepts/mongodb-indexing" className="text-sky-400 hover:text-sky-300">MongoDB indexing</Link>{" "}
          for exactly how that looks on real data.
        </p>
      </Section>

      <Section title="How to choose">
        <ul className="list-disc space-y-1 pl-5">
          <li>You don&rsquo;t usually build either structure yourself — pick a database engine that already uses one, or tune the engine you have.</li>
          <li>Reach for an LSM-based store (Cassandra, RocksDB-backed systems) for write-heavy workloads like logging, metrics, or event ingestion.</li>
          <li>Reach for a B-tree-based store (PostgreSQL, MySQL) when reads dominate and you need fast point lookups or range scans.</li>
          <li>Stuck with an LSM-tree and reads matter? Tune compaction settings and make sure bloom filters are enabled — both directly cut down read cost.</li>
          <li>Stuck with a B-tree and write throughput matters? Batch writes where you can and watch for index bloat from frequent updates.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Assuming &ldquo;NoSQL&rdquo; means LSM-tree, or vice versa — the storage engine and the data model are separate choices; MongoDB (a document database) uses a B⁺-tree, while some engines use LSM-trees underneath a SQL-like interface.</li>
          <li>Benchmarking an LSM-tree store right after a big write burst, before compaction has run — reads look artificially slow because there are extra SSTables still waiting to be merged.</li>
          <li>Picking a database purely on &ldquo;LSM vs B-tree&rdquo; in isolation — durability guarantees, replication, and query features usually matter more day-to-day than the storage engine alone.</li>
        </ul>
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
