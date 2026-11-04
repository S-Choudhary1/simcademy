"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

/* ================================================================== *
 * LSM-tree vs B-tree storage engines.
 *  • LSM: writes append to an in-memory memtable, which flushes to
 *    immutable SSTables. Writes are sequential (fast); a read may check
 *    the memtable + several SSTables. Write-optimized (Cassandra, RocksDB).
 *  • B-tree: writes update the leaf page in place (random I/O); a read
 *    follows one path root→leaf. Read-optimized (Postgres, InnoDB, WiredTiger).
 * ================================================================== */

const MEMTABLE_CAP = 4;
const WRITE_SEQ = [5, 2, 8, 1, 9, 3, 7, 4, 6, 11, 10, 12];
const LEAVES: { label: string; lo: number; hi: number }[] = [
  { label: "1–4", lo: 1, hi: 4 },
  { label: "5–8", lo: 5, hi: 8 },
  { label: "9–12", lo: 9, hi: 12 },
];

const TOUR: TourStep[] = [
  { title: "LSM-tree vs B-tree", body: "Two storage engines with opposite trade-offs. Write keys and read one back to see why." },
  { target: "[data-tour='lsm-write']", title: "Write keys", body: "LSM appends to an in-memory memtable that flushes to immutable SSTables — sequential, fast. The B-tree finds the right leaf and updates it in place — random I/O." },
  { target: "[data-tour='lsm-read']", title: "Read a key", body: "The LSM may scan the memtable plus several SSTables to find a key; the B-tree walks one path root→leaf. That's why LSM is write-optimized and B-tree read-optimized." },
];

export function LsmBtreeViz() {
  const [count, setCount] = useState(0);
  const [memtable, setMemtable] = useState<number[]>([]);
  const [sstables, setSstables] = useState<number[][]>([]); // newest first
  const [btree, setBtree] = useState<number[][]>(LEAVES.map(() => []));

  // read animation
  const [reading, setReading] = useState(false);
  const [readKey, setReadKey] = useState<number | null>(null);
  const [lsmProbe, setLsmProbe] = useState(-1); // 0 = memtable, 1.. = sstable index+1
  const [btProbe, setBtProbe] = useState(-1); // 0 = root, 1 = leaf
  const [touched, setTouched] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => clear(), []);

  const writeKey = () => {
    if (count >= WRITE_SEQ.length) return;
    clear();
    setReading(false);
    setLsmProbe(-1);
    setBtProbe(-1);
    setTouched(null);
    const key = WRITE_SEQ[count];
    setCount(count + 1);
    // LSM: append to memtable, flush to a new SSTable when full
    const nextMem = [...memtable, key].sort((a, b) => a - b);
    if (nextMem.length >= MEMTABLE_CAP) {
      setSstables([nextMem, ...sstables]);
      setMemtable([]);
    } else {
      setMemtable(nextMem);
    }
    // B-tree: update the matching leaf in place
    setBtree(btree.map((leaf, i) => (key >= LEAVES[i].lo && key <= LEAVES[i].hi ? [...leaf, key].sort((a, b) => a - b) : leaf)));
  };

  const readOldest = () => {
    if (count === 0) return;
    clear();
    const key = WRITE_SEQ[0]; // oldest written → likely deep in the SSTables
    // LSM search order: memtable, then sstables newest→oldest
    const stores = [memtable, ...sstables];
    let foundIdx = stores.findIndex((s) => s.includes(key));
    if (foundIdx < 0) foundIdx = stores.length - 1;
    setReadKey(key);
    setReading(true);
    setTouched(null);
    setLsmProbe(0);
    setBtProbe(0);
    let t = 0;
    timer.current = window.setInterval(() => {
      t += 1;
      setLsmProbe(Math.min(t, foundIdx));
      setBtProbe(t >= 1 ? 1 : 0);
      if (t >= foundIdx) {
        clear();
        setTouched(foundIdx + 1);
      }
    }, 750);
  };

  const reset = () => {
    clear();
    setCount(0);
    setMemtable([]);
    setSstables([]);
    setBtree(LEAVES.map(() => []));
    setReading(false);
    setReadKey(null);
    setLsmProbe(-1);
    setBtProbe(-1);
    setTouched(null);
  };

  const leafOf = (k: number) => LEAVES.findIndex((l) => k >= l.lo && k <= l.hi);
  const readLeaf = readKey !== null ? leafOf(readKey) : -1;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={writeKey} disabled={count >= WRITE_SEQ.length} data-tour="lsm-write" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">
          Write key{count < WRITE_SEQ.length ? ` (${WRITE_SEQ[count]})` : ""}
        </button>
        <button type="button" onClick={readOldest} disabled={count === 0} data-tour="lsm-read" className="rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-sm font-medium text-fuchsia-300 hover:bg-fuchsia-500/20 disabled:opacity-40">
          Read key {WRITE_SEQ[0]}
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
        <span className="ml-auto text-xs text-slate-500">{count} keys written</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* LSM */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-300">LSM-tree</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">write-optimized</span>
          </div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Memtable (in memory)</div>
          <div className={`mb-2 flex min-h-[28px] flex-wrap gap-1 rounded border p-1.5 ${reading && lsmProbe === 0 ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-slate-800 bg-slate-950/40"}`}>
            {memtable.length ? memtable.map((k) => <Cell key={k} k={k} hit={reading && readKey === k && lsmProbe === 0} />) : <span className="text-[10px] italic text-slate-600">empty</span>}
          </div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">SSTables (immutable, on disk)</div>
          <div className="space-y-1">
            {sstables.length ? sstables.map((ss, i) => (
              <div key={i} className={`flex flex-wrap gap-1 rounded border p-1.5 ${reading && lsmProbe === i + 1 ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-slate-800 bg-slate-950/40"}`}>
                {ss.map((k) => <Cell key={k} k={k} hit={reading && readKey === k && lsmProbe === i + 1} />)}
              </div>
            )) : <span className="text-[10px] italic text-slate-600">none yet — memtable flushes here when full</span>}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Write: <span className="text-emerald-300">append (sequential)</span> · Read: scans memtable + SSTables</div>
        </div>

        {/* B-tree */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-sky-300">B-tree</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">read-optimized</span>
          </div>
          <div className={`mx-auto mb-2 w-fit rounded border px-3 py-1 text-center ${reading && btProbe === 0 ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-slate-700 bg-slate-900"}`}>
            <div className="text-[9px] uppercase tracking-wide text-slate-500">root</div>
            <div className="font-mono text-[11px] text-slate-300">4 · 8</div>
          </div>
          <div className="text-center text-slate-600">▼</div>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {btree.map((leaf, i) => (
              <div key={i} className={`rounded border p-1.5 ${reading && btProbe === 1 && readLeaf === i ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-slate-800 bg-slate-950/40"}`}>
                <div className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">leaf {LEAVES[i].label}</div>
                <div className="flex flex-wrap gap-1">
                  {leaf.length ? leaf.map((k) => <Cell key={k} k={k} hit={reading && readKey === k && btProbe === 1} />) : <span className="text-[9px] italic text-slate-600">—</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Write: <span className="text-amber-300">update leaf in place (random)</span> · Read: one path root→leaf</div>
        </div>
      </div>

      {touched !== null ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
          Read key {readKey}: LSM checked <span className="font-semibold text-fuchsia-300">{touched} store{touched === 1 ? "" : "s"}</span> (memtable + SSTables) — the B-tree found it in <span className="font-semibold text-sky-300">1 page</span>. That gap is the read cost LSM pays for cheap writes (bloom filters and compaction reduce it in practice).
        </div>
      ) : null}

      <p className="mt-3 text-[12px] leading-snug text-slate-400">
        <strong className="text-emerald-300">LSM-tree</strong>{" "}turns every write into a sequential append, so it absorbs
        huge write throughput — used by <strong>Cassandra, RocksDB, LevelDB, ScyllaDB</strong>. <strong className="text-sky-300">B-tree</strong>{" "}
        keeps data in one sorted place, so point and range reads are cheap — used by <strong>PostgreSQL, MySQL/InnoDB, MongoDB (WiredTiger)</strong>.
      </p>

      <GuidedTour tourId="lsm-vs-btree" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Cell({ k, hit }: { k: number; hit: boolean }) {
  return (
    <span className={`flex h-5 min-w-[20px] items-center justify-center rounded px-1 font-mono text-[10px] ${hit ? "bg-emerald-500/80 text-slate-950" : "bg-slate-800 text-slate-300"}`}>{k}</span>
  );
}
