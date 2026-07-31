"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Query planning & joins", body: "How a query is planned and run — shown separately for PostgreSQL and MongoDB, because they differ." },
  { target: "[data-tour='qp-db']", title: "Pick a database", body: "Switch between Postgres and MongoDB — the index types, planner output, and join syntax all change to match." },
  { target: "[data-tour='qp-tabs']", title: "Three views", body: "Index types (which index serves a query), Planner (scan vs index by cost), and Joins (nested-loop / hash / merge, or $lookup)." },
];

/* ================================================================== *
 * Query planning & execution — shown per database, because Postgres
 * and MongoDB genuinely differ:
 *   • index types      (B-tree/GIN/GiST vs compound/multikey/text/geo)
 *   • the planner       (EXPLAIN cost model vs explain() docsExamined)
 *   • joins             (nested-loop/hash/merge vs $lookup)
 * ================================================================== */

type DB = "postgres" | "mongodb";
type Tab = "index" | "planner" | "joins";

const DB_LABEL: Record<DB, string> = { postgres: "PostgreSQL", mongodb: "MongoDB" };

export function QueryPlanningViz() {
  const [db, setDb] = useState<DB>("postgres");
  const [tab, setTab] = useState<Tab>("index");

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* DB toggle */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="qp-db">
          {(["postgres", "mongodb"] as DB[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDb(d)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                db === d ? (d === "postgres" ? "bg-sky-500 text-slate-950" : "bg-emerald-500 text-slate-950") : "text-slate-300 hover:text-white"
              }`}
            >
              {DB_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="qp-tabs">
          {(
            [
              ["index", "Index types"],
              ["planner", "Planner: scan vs index"],
              ["joins", "Joins"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === t ? "bg-slate-200 text-slate-900" : "text-slate-300 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "index" ? <IndexTab db={db} /> : tab === "planner" ? <PlannerTab db={db} /> : <JoinsTab db={db} />}
      <GuidedTour tourId="query-planning" steps={TOUR} autoStart={false} />
    </div>
  );
}

/* ============================ Index types ========================= */

type Pattern = "eq" | "range" | "sort" | "prefix" | "array" | "text" | "geo";

const PATTERNS: { key: Pattern; label: string; ex: Record<DB, string> }[] = [
  { key: "eq", label: "Equality (=)", ex: { postgres: "WHERE email = 'a@b.com'", mongodb: "{ email: 'a@b.com' }" } },
  { key: "range", label: "Range (<, >, BETWEEN)", ex: { postgres: "WHERE age BETWEEN 18 AND 30", mongodb: "{ age: { $gte: 18, $lte: 30 } }" } },
  { key: "sort", label: "Sort / ORDER BY", ex: { postgres: "ORDER BY created_at DESC", mongodb: ".sort({ created_at: -1 })" } },
  { key: "prefix", label: "Multi-column / prefix", ex: { postgres: "WHERE org_id = ? ORDER BY created_at", mongodb: "{ org_id: ? } .sort({ created_at: 1 })" } },
  { key: "array", label: "Array contains", ex: { postgres: "WHERE tags @> ARRAY['db']", mongodb: "{ tags: 'db' }" } },
  { key: "text", label: "Full-text search", ex: { postgres: "WHERE to_tsvector(body) @@ 'index'", mongodb: "{ $text: { $search: 'index' } }" } },
  { key: "geo", label: "Geospatial", ex: { postgres: "WHERE ST_DWithin(loc, pt, 1000)", mongodb: "{ loc: { $near: [x, y] } }" } },
];

interface IdxType { name: string; blurb: string; serves: Pattern[]; ddl: string }

const INDEXES: Record<DB, IdxType[]> = {
  postgres: [
    { name: "B-tree", blurb: "the default — ordered keys", serves: ["eq", "range", "sort", "prefix"], ddl: "CREATE INDEX ON t (col);" },
    { name: "Hash", blurb: "equality only, no range/sort", serves: ["eq"], ddl: "CREATE INDEX ON t USING hash (col);" },
    { name: "GIN", blurb: "arrays, jsonb, full-text", serves: ["array", "text"], ddl: "CREATE INDEX ON t USING gin (col);" },
    { name: "GiST", blurb: "geometry, ranges, nearest-neighbour", serves: ["geo", "range"], ddl: "CREATE INDEX ON t USING gist (col);" },
    { name: "BRIN", blurb: "huge, naturally-ordered tables", serves: ["range"], ddl: "CREATE INDEX ON t USING brin (col);" },
  ],
  mongodb: [
    { name: "Single-field", blurb: "B-tree on one field", serves: ["eq", "range", "sort"], ddl: "db.t.createIndex({ col: 1 })" },
    { name: "Compound", blurb: "multi-field, ESR rule", serves: ["eq", "range", "sort", "prefix"], ddl: "db.t.createIndex({ a: 1, b: -1 })" },
    { name: "Multikey", blurb: "auto on array fields", serves: ["array", "eq"], ddl: "db.t.createIndex({ tags: 1 })" },
    { name: "Text", blurb: "full-text search", serves: ["text"], ddl: 'db.t.createIndex({ body: "text" })' },
    { name: "2dsphere", blurb: "geospatial queries", serves: ["geo"], ddl: 'db.t.createIndex({ loc: "2dsphere" })' },
    { name: "Hashed", blurb: "equality + shard distribution", serves: ["eq"], ddl: 'db.t.createIndex({ col: "hashed" })' },
  ],
};

function IndexTab({ db }: { db: DB }) {
  const [pattern, setPattern] = useState<Pattern>("eq");
  const sel = PATTERNS.find((p) => p.key === pattern)!;
  const idx = INDEXES[db];
  const serving = idx.filter((i) => i.serves.includes(pattern));

  return (
    <div>
      <div className="mb-3">
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-500">What is your query doing?</div>
        <div className="flex flex-wrap gap-1.5">
          {PATTERNS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPattern(p.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${pattern === p.key ? "bg-fuchsia-500 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-[12px] text-slate-300">{sel.ex[db]}</div>
      </div>

      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-500">{DB_LABEL[db]} index types — highlighted = serves this query</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {idx.map((i) => {
          const on = i.serves.includes(pattern);
          return (
            <div
              key={i.name}
              className={`rounded-lg border p-2.5 transition ${on ? "border-emerald-500/60 bg-emerald-500/10" : "border-slate-800 bg-slate-900/40 opacity-60"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${on ? "text-emerald-200" : "text-slate-300"}`}>{i.name}</span>
                {on ? <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">serves it</span> : null}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">{i.blurb}</div>
              {on ? <div className="mt-1.5 font-mono text-[11px] text-slate-300">{i.ddl}</div> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] leading-snug text-slate-400">
        {serving.length === 0
          ? "No index type serves this pattern efficiently — it falls back to a full scan."
          : db === "postgres"
            ? `Postgres would use the ${serving.map((s) => s.name).join(" or ")} index here. The B-tree covers most day-to-day filters, sorts, and ranges; GIN/GiST exist for arrays, documents, text, and geometry.`
            : `MongoDB would use the ${serving.map((s) => s.name).join(" or ")} index. Single-field and compound cover most queries (remember the ESR rule: Equality, Sort, Range); multikey/text/2dsphere handle arrays, search, and geo.`}
      </p>
    </div>
  );
}

/* ============================ Planner ============================= */

// Same ten people as the indexing concepts. We range-filter on `age` (which has
// a B-tree index) and watch the planner flip as the threshold lets more rows through.
const PEOPLE = [
  { name: "Gus", age: 45 },
  { name: "Ana", age: 34 },
  { name: "Eli", age: 37 },
  { name: "Joy", age: 39 },
  { name: "Ben", age: 28 },
  { name: "Ivo", age: 26 },
  { name: "Cai", age: 41 },
  { name: "Hana", age: 31 },
  { name: "Dot", age: 23 },
  { name: "Fay", age: 29 },
];
const THRESHOLDS = [45, 40, 35, 30, 25, 20];

function PlannerTab({ db }: { db: DB }) {
  const [th, setTh] = useState(35);
  const n = PEOPLE.length;
  const m = PEOPLE.filter((p) => p.age >= th).length;

  // Illustrative cost in "page-read" units: a full scan reads all n rows once;
  // an index scan pays a small B-tree descent plus one random fetch per match.
  const seqCost = n;
  const idxCost = 2 + m * 1.5;
  const pgPick = idxCost < seqCost ? "index" : "seq";
  const mongoPick = idxCost < seqCost ? "ixscan" : "collscan";

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-500">Range query on the indexed column <span className="font-mono lowercase text-emerald-400">age</span></div>
      <div className="mb-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-[12px] text-slate-300">
        {db === "postgres" ? `SELECT * FROM users WHERE age >= ${th};` : `db.users.find({ age: { $gte: ${th} } })`}
      </div>

      <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Lower the threshold → more rows match</div>
      <div className="mb-3 inline-flex flex-wrap gap-1">
        {THRESHOLDS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTh(t)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${th === t ? "bg-sky-500 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"}`}
          >
            age ≥ {t}
          </button>
        ))}
      </div>

      {/* the 10 rows, matched ones highlighted */}
      <div className="mb-2 flex flex-wrap gap-1">
        {PEOPLE.map((p) => {
          const on = p.age >= th;
          return (
            <span key={p.name} className={`rounded border px-2 py-1 font-mono text-[11px] ${on ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-100" : "border-slate-800 bg-slate-900/40 text-slate-500"}`}>
              {p.name}:{p.age}
            </span>
          );
        })}
      </div>
      <div className="mb-3 text-[12px] text-slate-400">
        matches <span className="font-mono text-slate-200">{m}</span> of <span className="font-mono text-slate-200">{n}</span> rows
        <span className="text-slate-600"> · {Math.round((m / n) * 100)}% selectivity</span>
      </div>

      {db === "postgres" ? (
        <div className="space-y-2">
          <PlanRow title="Index Scan using idx_users_age on users" detail={`est. cost ${idxCost.toFixed(1)}  ·  rows=${m}  — descend B-tree + ${m} random fetch(es)`} chosen={pgPick === "index"} />
          <PlanRow title="Seq Scan on users" detail={`est. cost ${seqCost.toFixed(1)}  ·  rows=${m}  — read all ${n} rows once`} chosen={pgPick === "seq"} />
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[12px] text-slate-300">
            EXPLAIN → planner picks{" "}
            <span className={pgPick === "index" ? "text-emerald-300" : "text-amber-300"}>{pgPick === "index" ? "Index Scan" : "Seq Scan"}</span>{" "}
            <span className="text-slate-500">(lowest estimated cost wins)</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <PlanRow title="IXSCAN → FETCH" detail={`totalDocsExamined: ${m}  ·  nReturned: ${m}  ·  ratio 1:1 (ideal)`} chosen={mongoPick === "ixscan"} />
          <PlanRow title="COLLSCAN" detail={`totalDocsExamined: ${n}  ·  nReturned: ${m}  ·  ratio ${(n / m).toFixed(1)}:1`} chosen={mongoPick === "collscan"} />
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-[12px] text-slate-300">
            explain(&quot;executionStats&quot;) → winningPlan:{" "}
            <span className={mongoPick === "ixscan" ? "text-emerald-300" : "text-amber-300"}>{mongoPick === "ixscan" ? "IXSCAN" : "COLLSCAN"}</span>{" "}
            <span className="text-slate-500">(fewest documents examined wins)</span>
          </div>
        </div>
      )}

      <p className="mt-3 text-[12px] leading-snug text-slate-400">
        With a selective filter (few rows match) the index wins easily. But as the threshold drops and most rows
        qualify, one sequential sweep beats a random fetch per row — so the planner{" "}
        <strong className="text-slate-300">abandons the index for a full scan</strong>. That crossover is why an index
        on a low-selectivity filter is often ignored.{" "}
        {db === "postgres"
          ? "Postgres estimates a numeric cost from ANALYZE statistics and picks the cheapest plan."
          : "MongoDB races candidate plans and keeps the one examining the fewest documents — verify with totalDocsExamined ÷ nReturned."}
      </p>
    </div>
  );
}

function PlanRow({ title, detail, chosen }: { title: string; detail: string; chosen: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${chosen ? "border-emerald-500/60 bg-emerald-500/10" : "border-slate-800 bg-slate-900/40 opacity-70"}`}>
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[13px] font-semibold ${chosen ? "text-emerald-200" : "text-slate-300"}`}>{title}</span>
        {chosen ? <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">chosen</span> : null}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-slate-400">{detail}</div>
    </div>
  );
}

/* ============================== Joins ============================= */

const USERS = [
  { id: 1, name: "Ann" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Cy" },
];
const ORDERS = [
  { i: 0, u: 1, amt: 40 },
  { i: 1, u: 1, amt: 15 },
  { i: 2, u: 2, amt: 99 },
  { i: 3, u: 3, amt: 5 },
  { i: 4, u: 3, amt: 20 },
];

type PgStrategy = "nested" | "hash" | "merge";

interface JoinStep {
  hlUsers: number[];
  hlOrders: number[];
  result: string[];
  note: string;
  badge?: string;
}

function nestedSteps(): JoinStep[] {
  const steps: JoinStep[] = [];
  const result: string[] = [];
  for (const u of USERS) {
    steps.push({ hlUsers: [u.id], hlOrders: [], result: [...result], note: `outer row user ${u.id} (${u.name}) — scan orders where user_id = ${u.id}`, badge: "scan inner" });
    const m = ORDERS.filter((o) => o.u === u.id);
    for (const o of m) result.push(`${u.name} · $${o.amt}`);
    steps.push({ hlUsers: [u.id], hlOrders: m.map((o) => o.i), result: [...result], note: `${m.length} match — emit ${m.length} row(s)`, badge: "emit" });
  }
  steps.push({ hlUsers: [], hlOrders: [], result: [...result], note: `done · ${result.length} rows. Nested loop = |outer| × inner-lookup; best when the outer side is small and the inner is indexed.` });
  return steps;
}

function hashSteps(): JoinStep[] {
  const steps: JoinStep[] = [];
  const result: string[] = [];
  for (const u of USERS) steps.push({ hlUsers: [u.id], hlOrders: [], result: [], note: `build phase — hash users.id = ${u.id} into a bucket`, badge: "build" });
  for (const o of ORDERS) {
    const u = USERS.find((x) => x.id === o.u)!;
    result.push(`${u.name} · $${o.amt}`);
    steps.push({ hlUsers: [u.id], hlOrders: [o.i], result: [...result], note: `probe phase — order.user_id = ${o.u} hits bucket ${o.u} → ${u.name}`, badge: "probe" });
  }
  steps.push({ hlUsers: [], hlOrders: [], result: [...result], note: `done · ${result.length} rows. Hash join = build a hash table on the smaller input, stream the larger and probe. Cost ≈ |a| + |b|; best for large, unsorted equi-joins.` });
  return steps;
}

function mergeSteps(): JoinStep[] {
  const steps: JoinStep[] = [];
  const result: string[] = [];
  const us = [...USERS].sort((a, b) => a.id - b.id);
  const os = [...ORDERS].sort((a, b) => a.u - b.u);
  let i = 0;
  let j = 0;
  steps.push({ hlUsers: [], hlOrders: [], result: [], note: "both inputs are already sorted on the join key — advance two pointers", badge: "sorted" });
  while (i < us.length && j < os.length) {
    const u = us[i];
    const o = os[j];
    if (o.u === u.id) {
      result.push(`${u.name} · $${o.amt}`);
      steps.push({ hlUsers: [u.id], hlOrders: [o.i], result: [...result], note: `keys match (${u.id}) — emit, advance orders pointer`, badge: "match" });
      j++;
    } else if (o.u < u.id) {
      steps.push({ hlUsers: [u.id], hlOrders: [o.i], result: [...result], note: `order key ${o.u} < user ${u.id} — advance orders pointer`, badge: "advance" });
      j++;
    } else {
      steps.push({ hlUsers: [u.id], hlOrders: [o.i], result: [...result], note: `user ${u.id} < order key ${o.u} — advance users pointer`, badge: "advance" });
      i++;
    }
  }
  steps.push({ hlUsers: [], hlOrders: [], result: [...result], note: `done · ${result.length} rows. Merge join = one pass over two sorted inputs. Cost ≈ sort + merge; best when both sides already come sorted (e.g. from an index).` });
  return steps;
}

function lookupSteps(): JoinStep[] {
  const steps: JoinStep[] = [];
  const result: string[] = [];
  for (const u of USERS) {
    steps.push({ hlUsers: [u.id], hlOrders: [], result: [...result], note: `$lookup — for user ${u.id} (${u.name}), index-seek orders where user_id = ${u.id}`, badge: "$lookup" });
    const m = ORDERS.filter((o) => o.u === u.id);
    result.push(`{ ${u.name}, orders: [${m.map((o) => "$" + o.amt).join(", ")}] }`);
    steps.push({ hlUsers: [u.id], hlOrders: m.map((o) => o.i), result: [...result], note: `attach ${m.length} matching order(s) as an embedded array`, badge: "embed" });
  }
  steps.push({ hlUsers: [], hlOrders: [], result: [...result], note: `done · ${result.length} docs. $lookup is an (indexed) nested-loop join — without an index on orders.user_id it is O(users × orders). Idiomatic MongoDB often embeds orders in the user document to skip the join entirely.` });
  return steps;
}

function JoinsTab({ db }: { db: DB }) {
  const [strategy, setStrategy] = useState<PgStrategy>("nested");
  const [steps, setSteps] = useState<JoinStep[]>([]);
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
    const seq = db === "mongodb" ? lookupSteps() : strategy === "nested" ? nestedSteps() : strategy === "hash" ? hashSteps() : mergeSteps();
    setSteps(seq);
    setTick(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setTick(i);
      if (i >= seq.length) clear();
    }, 900);
  };

  const cur = tick > 0 && tick <= steps.length ? steps[tick - 1] : null;
  const hlUsers = cur?.hlUsers ?? [];
  const hlOrders = cur?.hlOrders ?? [];
  const result = cur?.result ?? [];

  const pipeline =
    db === "mongodb"
      ? `db.users.aggregate([
  { $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "user_id",
      as: "orders" } }
])`
      : `SELECT u.name, o.amt
FROM users u
JOIN orders o ON o.user_id = u.id;`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {db === "postgres" ? (
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
            {(
              [
                ["nested", "Nested loop"],
                ["hash", "Hash join"],
                ["merge", "Merge join"],
              ] as [PgStrategy, string][]
            ).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStrategy(s);
                  reset();
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${strategy === s ? "bg-fuchsia-500 text-slate-950" : "text-slate-300 hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span className="rounded-md border border-emerald-700/50 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">$lookup (aggregation join)</span>
        )}
        <button type="button" onClick={run} className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Run join</button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
      </div>

      <pre className="mb-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-[12px] leading-snug text-slate-300">{pipeline}</pre>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniTable title="users" cols={["id", "name"]} rows={USERS.map((u) => [String(u.id), u.name])} highlight={USERS.map((u) => hlUsers.includes(u.id))} />
        <MiniTable title="orders" cols={["user_id", "amt"]} rows={ORDERS.map((o) => [String(o.u), "$" + o.amt])} highlight={ORDERS.map((o) => hlOrders.includes(o.i))} />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">{db === "mongodb" ? "Result docs" : "Result rows"}</span>
          {cur?.badge ? <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">{cur.badge}</span> : null}
        </div>
        <div className="min-h-[52px] rounded-lg border border-slate-800 bg-slate-950/60 p-2 font-mono text-[12px] text-emerald-200">
          {result.length ? result.map((r, k) => <div key={k}>{r}</div>) : <span className="text-slate-600">— run the join —</span>}
        </div>
      </div>

      <div className="mt-2 min-h-[32px] text-[12px] leading-snug text-sky-300">{cur?.note ?? " "}</div>
    </div>
  );
}

function MiniTable({ title, cols, rows, highlight }: { title: string; cols: string[]; rows: string[][]; highlight: boolean[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <div className="border-b border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-300">{title}</div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-slate-500">
            {cols.map((c) => (
              <th key={c} className="px-2.5 py-1 text-left font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r, ri) => (
            <tr key={ri} className={highlight[ri] ? "bg-sky-500/20 text-sky-100" : "text-slate-400"}>
              {r.map((cell, ci) => (
                <td key={ci} className="px-2.5 py-1">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
