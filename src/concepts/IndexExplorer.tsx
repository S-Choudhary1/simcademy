"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const INDEX_TOUR: TourStep[] = [
  { title: "How an index works", body: "Real rows, a real B⁺-tree index, and what a search costs with and without an index." },
  { target: "[data-tour='indexing-field']", title: "Pick a field", body: "Search on email (indexed) or city (not indexed). We never search by id — the point is a normal column with and without an index." },
  { target: "[data-tour='indexing-run']", title: "Run the search", body: "An indexed search descends the tree and fetches one row; an unindexed one does a full scan of every row." },
  { target: "[data-tour='indexing-view']", title: "Data + index", body: "Left: the real rows/documents. Right: the B⁺-tree on email, each leaf entry pointing back to a row." },
  { target: "[data-tour='indexing-stats']", title: "Count the cost", body: "Rows examined vs returned, and the chosen plan — Index Scan vs Seq Scan (Postgres) or IXSCAN vs COLLSCAN (Mongo)." },
];

/* ================================================================== *
 * Concrete index explorer — real rows, a real index, and a real
 * search. Used by two concepts (PostgreSQL, MongoDB). We search on a
 * NON-key field so the point of an index is obvious:
 *   • email  → has an index  → seek the index, follow the pointer
 *   • city   → has NO index  → scan every row/document
 * ================================================================== */

export type DB = "postgres" | "mongodb";

interface Row {
  pos: number; // physical slot in the heap / collection (insertion order)
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
}

// Heap / collection order = insertion order, deliberately NOT sorted by email,
// so the sorted index clearly differs from the physical layout.
const HEAP: Row[] = [
  { pos: 0, id: 1, name: "Gus Roy", email: "gus@acme.io", age: 45, city: "Paris" },
  { pos: 1, id: 2, name: "Ana Ruiz", email: "ana@acme.io", age: 34, city: "Paris" },
  { pos: 2, id: 3, name: "Eli Novak", email: "eli@acme.io", age: 37, city: "Tokyo" },
  { pos: 3, id: 4, name: "Joy Adeyemi", email: "joy@acme.io", age: 39, city: "Tokyo" },
  { pos: 4, id: 5, name: "Ben Cole", email: "ben@acme.io", age: 28, city: "Tokyo" },
  { pos: 5, id: 6, name: "Ivo Marsh", email: "ivo@acme.io", age: 26, city: "Seoul" },
  { pos: 6, id: 7, name: "Cai Wen", email: "cai@acme.io", age: 41, city: "Paris" },
  { pos: 7, id: 8, name: "Hana Kim", email: "hana@acme.io", age: 31, city: "Seoul" },
  { pos: 8, id: 9, name: "Dot Frey", email: "dot@acme.io", age: 23, city: "Berlin" },
  { pos: 9, id: 10, name: "Fay Ito", email: "fay@acme.io", age: 29, city: "Berlin" },
];

const CITIES = ["Paris", "Tokyo", "Seoul", "Berlin", "Rome"]; // Rome = no match

// The B-tree index on `email`: leaves hold the sorted keys + a pointer to the
// heap slot; the root holds separator keys that route a search to a leaf.
const SORTED = [...HEAP].map((r) => ({ email: r.email, pos: r.pos })).sort((a, b) => (a.email < b.email ? -1 : 1));
const LEAVES = [SORTED.slice(0, 3), SORTED.slice(3, 6), SORTED.slice(6, 8), SORTED.slice(8, 10)];
const SEPARATORS = [LEAVES[1][0].email, LEAVES[2][0].email, LEAVES[3][0].email]; // first key of L1,L2,L3

function routeToLeaf(email: string): number {
  if (email < SEPARATORS[0]) return 0;
  if (email < SEPARATORS[1]) return 1;
  if (email < SEPARATORS[2]) return 2;
  return 3;
}

/* ---- terminology per database ------------------------------------ */
const T = {
  postgres: {
    store: "Heap (table on disk)",
    ptr: (pos: number) => `(0,${pos + 1})`,
    ptrCol: "ctid",
    indexed: "Index Scan",
    scan: "Seq Scan",
    ddl: "CREATE INDEX idx_users_email ON users (email);",
    q: (f: "email" | "city", v: string) => `SELECT * FROM users WHERE ${f} = '${v}';`,
    examinedLabel: "rows",
  },
  mongodb: {
    store: "Collection (documents on disk)",
    ptr: (pos: number) => `RID:${pos + 1}`,
    ptrCol: "RecordId",
    indexed: "IXSCAN → FETCH",
    scan: "COLLSCAN",
    ddl: "db.users.createIndex({ email: 1 })",
    q: (f: "email" | "city", v: string) => `db.users.find({ ${f}: "${v}" })`,
    examinedLabel: "docs",
  },
} as const;

/* ---- animation steps --------------------------------------------- */
type Stage = "root" | "leaf" | "fetch" | "scan" | "done";
interface Step {
  stage: Stage;
  leafIndex?: number;
  activePos?: number; // heap row currently highlighted (fetch or scan cursor)
  matched: number[]; // heap positions returned so far
  examined: number; // rows/docs examined so far
  indexReads: number; // index pages touched
  note: string;
}

function emailSteps(email: string, db: DB): Step[] {
  const t = T[db];
  const li = routeToLeaf(email);
  const hit = LEAVES[li].find((k) => k.email === email);
  const steps: Step[] = [
    {
      stage: "root",
      matched: [],
      examined: 0,
      indexReads: 1,
      note: `descend the index: is "${email}" < ${SEPARATORS.join(" / ")}? → route to leaf ${li}`,
    },
    {
      stage: "leaf",
      leafIndex: li,
      matched: [],
      examined: 0,
      indexReads: 2,
      note: hit ? `leaf ${li}: found "${email}" → pointer ${t.ptr(hit.pos)}` : `leaf ${li}: "${email}" is not in the index`,
    },
  ];
  if (hit) {
    steps.push({
      stage: "fetch",
      leafIndex: li,
      activePos: hit.pos,
      matched: [hit.pos],
      examined: 1,
      indexReads: 2,
      note: `follow pointer ${t.ptr(hit.pos)} → fetch one ${db === "postgres" ? "row" : "document"}: ${HEAP[hit.pos].name}, ${HEAP[hit.pos].city}`,
    });
  }
  steps.push({
    stage: "done",
    leafIndex: hit ? li : undefined,
    matched: hit ? [hit.pos] : [],
    examined: hit ? 1 : 0,
    indexReads: 2,
    note: hit
      ? `${t.indexed}: examined 1 ${t.examinedLabel} (+2 index reads), returned 1. The index jumped straight to it — no matter how big the table gets.`
      : `${t.indexed}: the index proved "${email}" doesn't exist without touching the table at all.`,
  });
  return steps;
}

function citySteps(city: string, db: DB): Step[] {
  const t = T[db];
  const matched: number[] = [];
  const steps: Step[] = [];
  for (let i = 0; i < HEAP.length; i++) {
    const isMatch = HEAP[i].city === city;
    if (isMatch) matched.push(i);
    steps.push({
      stage: "scan",
      activePos: i,
      matched: [...matched],
      examined: i + 1,
      indexReads: 0,
      note: `${db === "postgres" ? "row" : "doc"} ${i + 1}/10 — city = "${HEAP[i].city}" ${isMatch ? "✓ keep" : "✗ skip"}`,
    });
  }
  steps.push({
    stage: "done",
    matched: [...matched],
    examined: HEAP.length,
    indexReads: 0,
    note: `${t.scan}: no index on city, so every one of the ${HEAP.length} ${t.examinedLabel} was examined to return ${matched.length}. This cost grows linearly with the table.`,
  });
  return steps;
}

/* ================================================================== */

export function IndexExplorer({ db }: { db: DB }) {
  const t = T[db];
  const [field, setField] = useState<"email" | "city">("email");
  const [email, setEmail] = useState(HEAP[2].email); // eli@acme.io
  const [city, setCity] = useState("Tokyo");
  const [steps, setSteps] = useState<Step[]>([]);
  const [tick, setTick] = useState(0);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => clear(), []);

  const reset = () => {
    clear();
    setSteps([]);
    setTick(0);
  };

  const run = () => {
    clear();
    const seq = field === "email" ? emailSteps(email, db) : citySteps(city, db);
    setSteps(seq);
    setTick(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setTick(i);
      if (i >= seq.length) clear();
    }, field === "email" ? 950 : 480);
  };

  const cur = tick > 0 && tick <= steps.length ? steps[tick - 1] : null;
  const activeLeaf = cur?.leafIndex;
  const activePos = cur?.activePos;
  const matched = cur?.matched ?? [];
  const usingIndex = field === "email";
  const value = field === "email" ? email : city;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="indexing-field">
          <button
            type="button"
            onClick={() => { setField("email"); reset(); }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${field === "email" ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            email <span className="opacity-70">(indexed)</span>
          </button>
          <button
            type="button"
            onClick={() => { setField("city"); reset(); }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${field === "city" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            city <span className="opacity-70">(no index)</span>
          </button>
        </div>

        {field === "email" ? (
          <select value={email} onChange={(e) => { setEmail(e.target.value); reset(); }} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200">
            {SORTED.map((s) => (<option key={s.email} value={s.email}>{s.email}</option>))}
          </select>
        ) : (
          <select value={city} onChange={(e) => { setCity(e.target.value); reset(); }} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200">
            {CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        )}

        <button type="button" onClick={run} data-tour="indexing-run" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Run search</button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
      </div>

      {/* query echo */}
      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-[12px] text-slate-300">
        {t.q(field, value)}
        <span className="ml-2 text-slate-500">{usingIndex ? `// uses ${t.ddl.includes("createIndex") ? "{ email: 1 }" : "idx_users_email"} → ${t.indexed}` : `// no index on city → ${t.scan}`}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="indexing-view">
        {/* data (heap / collection) */}
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-500">{t.store} — {HEAP.length} {db === "postgres" ? "rows" : "documents"}</div>
          {db === "postgres" ? (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-slate-900 text-slate-500">
                    <th className="px-2 py-1 text-left font-medium">{t.ptrCol}</th>
                    <th className="px-2 py-1 text-left font-medium">id</th>
                    <th className="px-2 py-1 text-left font-medium">name</th>
                    <th className="px-2 py-1 text-left font-medium">email</th>
                    <th className="px-2 py-1 text-left font-medium">city</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {HEAP.map((r) => {
                    const on = activePos === r.pos;
                    const keep = cur?.stage === "done" && matched.includes(r.pos);
                    return (
                      <tr key={r.pos} className={on ? "bg-sky-500/25 text-sky-100" : keep ? "bg-emerald-500/15 text-emerald-100" : "text-slate-400"}>
                        <td className="px-2 py-1 text-slate-500">{t.ptr(r.pos)}</td>
                        <td className="px-2 py-1">{r.id}</td>
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1">{r.email}</td>
                        <td className="px-2 py-1">{r.city}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-[320px] space-y-1.5 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-2">
              {HEAP.map((r) => {
                const on = activePos === r.pos;
                const keep = cur?.stage === "done" && matched.includes(r.pos);
                return (
                  <div key={r.pos} className={`rounded border px-2 py-1 font-mono text-[11px] leading-snug ${on ? "border-sky-400 bg-sky-500/20 text-sky-100" : keep ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100" : "border-slate-800 bg-slate-950/40 text-slate-400"}`}>
                    <span className="text-slate-600">{t.ptr(r.pos)} </span>
                    {`{ "_id": ${r.id}, "name": "${r.name}", "email": "${r.email}", "age": ${r.age}, "city": "${r.city}" }`}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* index */}
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
            B⁺-tree index on <span className="font-mono lowercase text-emerald-400">email</span>
            {!usingIndex ? <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">not used — city has no index</span> : null}
          </div>
          <div className={usingIndex ? "" : "opacity-40"}>
            {/* root */}
            <div className={`mx-auto mb-2 w-fit rounded-lg border px-3 py-1.5 text-center ${cur?.stage === "root" ? "border-sky-400 bg-sky-500/20" : "border-slate-700 bg-slate-900"}`}>
              <div className="text-[9px] uppercase tracking-wide text-slate-500">root · separators</div>
              <div className="font-mono text-[12px] text-slate-200">{SEPARATORS.map((s) => s.replace("@acme.io", "")).join(" · ")}</div>
            </div>
            <div className="text-center text-slate-600">▼</div>
            {/* leaves */}
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {LEAVES.map((leaf, li) => {
                const on = activeLeaf === li;
                return (
                  <div key={li} className={`rounded-lg border p-1.5 ${on ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800 bg-slate-900/40"}`}>
                    <div className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">leaf {li}</div>
                    <div className="space-y-1 font-mono text-[10px]">
                      {leaf.map((k) => {
                        const isHit = usingIndex && field === "email" && k.email === email && (cur?.stage === "leaf" || cur?.stage === "fetch" || cur?.stage === "done") && activeLeaf === li;
                        return (
                          <div key={k.email} className={`flex items-center justify-between gap-1 rounded px-1 ${isHit ? "bg-emerald-500/25 text-emerald-100" : "text-slate-400"}`}>
                            <span>{k.email.replace("@acme.io", "")}</span>
                            <span className="text-slate-600">{t.ptr(k.pos)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-snug text-slate-500">
              Each leaf entry is <span className="font-mono">email → {t.ptrCol}</span>, kept sorted. A search walks root → leaf in ~log(n) steps, then follows the pointer into the {db === "postgres" ? "heap" : "collection"}. This is a <strong className="text-slate-400">B⁺-tree</strong>: separator keys only route in the root, <em>every</em>{" "}real entry lives in a leaf, and leaves are linked in order (which makes range scans fast). {db === "postgres" ? "Postgres names the access method btree, but implements it as a B⁺-tree (Lehman–Yao)." : "MongoDB's docs call this a “B-tree”, but the WiredTiger engine implements it as a B⁺-tree — internal pages hold only routing keys, values live in leaves."}
            </p>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="mt-4 grid grid-cols-3 gap-2" data-tour="indexing-stats">
        <Stat label={`${t.examinedLabel} examined`} value={cur ? String(cur.examined) : "—"} tone={usingIndex ? "ok" : cur?.stage === "done" ? "warn" : "neutral"} />
        <Stat label="returned" value={cur ? String(matched.length) : "—"} tone="neutral" />
        <Stat label="chosen plan" value={usingIndex ? t.indexed : t.scan} tone={usingIndex ? "ok" : "warn"} />
      </div>
      <div className="mt-2 min-h-[34px] text-[12px] leading-snug text-sky-300">{cur?.note ?? " "}</div>
      <GuidedTour tourId={`indexing-${db}`} steps={INDEX_TOUR} autoStart={false} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "neutral" }) {
  const color = tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-slate-200";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function PostgresIndexViz() {
  return <IndexExplorer db="postgres" />;
}
export function MongoIndexViz() {
  return <IndexExplorer db="mongodb" />;
}
