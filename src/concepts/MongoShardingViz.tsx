"use client";

import { useState } from "react";

type ShardKey = "hashed" | "country" | "timestamp";
const SHARDS = 4;
const BATCH = 40;

const SKEW: Record<ShardKey, number[]> = {
  hashed: [0.25, 0.25, 0.25, 0.25],
  country: [0.6, 0.25, 0.1, 0.05],
  timestamp: [0, 0, 0, 1],
};
const LABEL: Record<ShardKey, string> = {
  hashed: "Hashed user id (good)",
  country: "Country (low cardinality)",
  timestamp: "Timestamp (monotonic)",
};
const NOTE: Record<ShardKey, string> = {
  hashed: "High cardinality + hashed → documents spread evenly across shards.",
  country: "Few distinct, skewed values → one shard holds most of the data (a hot shard).",
  timestamp: "Monotonically increasing → every new write lands on the newest shard (a hot shard).",
};

/**
 * MongoDB sharding: how the shard key distributes data, and how mongos routes
 * queries. A good key spreads load evenly; a low-cardinality or monotonic key
 * creates a hot shard. Targeted queries (with the shard key) hit one shard;
 * scatter-gather queries hit them all.
 */
export function MongoShardingViz() {
  const [key, setKey] = useState<ShardKey>("hashed");
  const [counts, setCounts] = useState<number[]>(Array(SHARDS).fill(0));
  const [touched, setTouched] = useState<number[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const insert = () => {
    const dist = SKEW[key];
    const add = Array(SHARDS).fill(0);
    let assigned = 0;
    for (let i = 0; i < SHARDS; i++) {
      add[i] = i === SHARDS - 1 ? BATCH - assigned : Math.round(BATCH * dist[i]);
      assigned += add[i];
    }
    setCounts((c) => c.map((v, i) => v + add[i]));
    setTouched(null);
    setMsg(`Inserted ${BATCH} documents keyed by ${LABEL[key]}.`);
  };

  const changeKey = (k: ShardKey) => {
    setKey(k);
    setCounts(Array(SHARDS).fill(0));
    setTouched(null);
    setMsg(null);
  };

  const targeted = () => {
    setTouched([1]);
    setMsg("Targeted query (filters on the shard key) → mongos routes to Shard 1 only (1 of 4).");
  };
  const scatter = () => {
    setTouched([0, 1, 2, 3]);
    setMsg("Scatter-gather (no shard key in the filter) → mongos queries ALL 4 shards and merges results.");
  };
  const reset = () => {
    setCounts(Array(SHARDS).fill(0));
    setTouched(null);
    setMsg(null);
  };

  const total = counts.reduce((a, b) => a + b, 0);
  const avg = total / SHARDS;
  const max = Math.max(1, ...counts);
  const hot = (i: number) => total > 0 && counts[i] > 1.6 * avg;
  const anyHot = counts.some((_, i) => hot(i));

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-400">Shard key</span>
          <select value={key} onChange={(e) => changeKey(e.target.value as ShardKey)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200">
            {(Object.keys(LABEL) as ShardKey[]).map((k) => (
              <option key={k} value={k}>
                {LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={insert} className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">
          Insert {BATCH} docs
        </button>
        <button type="button" onClick={targeted} className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20">
          Targeted query
        </button>
        <button type="button" onClick={scatter} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20">
          Scatter-gather
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
        <span>Clients</span>
        <span>→</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">mongos router</span>
        <span>→ shards</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {counts.map((c, i) => {
          const inQuery = touched?.includes(i);
          return (
            <div
              key={i}
              className={`rounded-lg border p-2 ${hot(i) ? "border-red-500/50 bg-red-500/10" : "border-slate-800 bg-slate-900"} ${inQuery ? "ring-2 ring-sky-400" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-200">Shard {i}</span>
                <span className="text-[11px] tabular-nums text-slate-400">{c}</span>
              </div>
              <div className="mt-1 flex h-16 items-end">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${Math.max(2, (c / max) * 100)}%`, background: hot(i) ? "#f87171" : "#38bdf8" }}
                />
              </div>
              {hot(i) ? <div className="mt-1 text-center text-[9px] font-semibold text-red-300">HOT</div> : null}
            </div>
          );
        })}
      </div>

      <div
        className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
          anyHot ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-slate-800 bg-slate-900 text-slate-300"
        }`}
      >
        {msg ?? "Pick a shard key, insert documents, and see how they distribute. Then run a query to see routing."}
        {total > 0 ? <span className="ml-1 text-slate-500"> {NOTE[key]}</span> : null}
      </div>
    </div>
  );
}
