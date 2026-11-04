"use client";

import { useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Sharding & partitioning", body: "See how splitting a keyspace across shards affects load balance — and what a resharding costs." },
  { target: "[data-tour='shard-mode']", title: "Range vs hash", body: "Range keeps keys ordered (great for range scans); hash scatters them evenly. They fail in opposite ways — flip between them." },
  { target: "[data-tour='shard-workload']", title: "Try a nasty workload", body: "Switch keys to 'sequential' (like auto-increment ids or timestamps). Under range sharding they all pile into the last shard — a hot shard." },
  { target: "[data-tour='shard-count']", title: "Reshard", body: "Add or remove a shard and watch the 'moved on last reshard' metric. With hash sharding, adding one shard remaps almost every key." },
  { target: "[data-tour='shard-metrics']", title: "Read the balance", body: "Load skew shows how uneven the shards are; the movement % shows the reshuffle cost — the problem consistent hashing solves." },
];

/* ================================================================== *
 * Sharding / partitioning — how a keyspace is split across shards.
 *   • RANGE: contiguous key ranges per shard → range scans are cheap,
 *     but sequential keys (auto-inc ids, timestamps) create a HOT shard.
 *   • HASH: hash(key) % N spreads evenly → no hot spot, but no range
 *     scans, and naive resharding (mod N) moves almost every key.
 * ================================================================== */

type Mode = "range" | "hash";
type Workload = "uniform" | "recent";

const KEYSETS: Record<Workload, number[]> = {
  uniform: [3, 17, 42, 8, 55, 91, 26, 73, 60, 34, 88, 12, 49, 67, 5, 80, 21, 95, 38, 71],
  recent: Array.from({ length: 20 }, (_, i) => 80 + i), // clustered high (e.g. latest timestamps)
};

const hash = (k: number) => (k * 2654435761) >>> 0;
const shardOf = (key: number, mode: Mode, n: number) =>
  mode === "range" ? Math.min(n - 1, Math.floor(key / (100 / n))) : hash(key) % n;

const PALETTE = ["#38bdf8", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185"];

export function ShardingViz() {
  const [mode, setMode] = useState<Mode>("range");
  const [workload, setWorkload] = useState<Workload>("uniform");
  const [shards, setShards] = useState(3);
  const [moved, setMoved] = useState<{ count: number; total: number } | null>(null);

  const keys = KEYSETS[workload];
  const buckets: number[][] = Array.from({ length: shards }, () => []);
  for (const k of [...keys].sort((a, b) => a - b)) buckets[shardOf(k, mode, shards)].push(k);
  const counts = buckets.map((b) => b.length);
  const maxCount = Math.max(1, ...counts);
  const hottest = counts.indexOf(Math.max(...counts));
  const skew = Math.max(...counts) - Math.min(...counts);

  const reshard = (delta: number) => {
    const next = shards + delta;
    if (next < 1 || next > 6) return;
    let count = 0;
    for (const k of keys) if (shardOf(k, mode, shards) !== shardOf(k, mode, next)) count++;
    setMoved({ count, total: keys.length });
    setShards(next);
  };

  const changeMode = (m: Mode) => { setMode(m); setMoved(null); };
  const changeWorkload = (w: Workload) => { setWorkload(w); setMoved(null); };
  const reset = () => { setMode("range"); setWorkload("uniform"); setShards(3); setMoved(null); };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="shard-mode">
          {(["range", "hash"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => changeMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${mode === m ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>
              {m === "range" ? "Range sharding" : "Hash sharding"}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="shard-workload">
          {(["uniform", "recent"] as Workload[]).map((w) => (
            <button key={w} type="button" onClick={() => changeWorkload(w)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${workload === w ? "bg-fuchsia-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>
              {w === "uniform" ? "Keys: spread out" : "Keys: sequential (recent)"}
            </button>
          ))}
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-700" data-tour="shard-count">
          <button type="button" onClick={() => reshard(1)} disabled={shards >= 6} className="bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">+ Shard</button>
          <button type="button" onClick={() => reshard(-1)} disabled={shards <= 1} className="border-l border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">− Shard</button>
        </div>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
      </div>

      {/* shards */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(shards, 3)}, minmax(0, 1fr))` }}>
        {buckets.map((b, s) => {
          const isHot = s === hottest && skew > 0;
          return (
            <div key={s} className={`rounded-lg border p-2.5 ${isHot ? "border-red-500/60 bg-red-500/10" : "border-slate-800 bg-slate-900/40"}`}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[s % PALETTE.length] }} />
                  Shard {s}
                </span>
                <span className={`font-mono text-[11px] tabular-nums ${isHot ? "text-red-300" : "text-slate-400"}`}>{b.length} keys{isHot ? " · HOT" : ""}</span>
              </div>
              <div className="mb-1.5 text-[10px] text-slate-500">{mode === "range" ? `range ${Math.round(s * (100 / shards))}–${Math.round((s + 1) * (100 / shards)) - 1}` : `hash(key) % ${shards} = ${s}`}</div>
              <div className="flex flex-wrap gap-1">
                {b.length ? b.map((k) => (
                  <span key={k} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{k}</span>
                )) : <span className="text-[10px] italic text-slate-600">empty</span>}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${(b.length / maxCount) * 100}%`, background: isHot ? "#f87171" : PALETTE[s % PALETTE.length] }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2" data-tour="shard-metrics">
        <Stat label="shards" value={String(shards)} />
        <Stat label="load skew (max−min)" value={String(skew)} tone={skew > 3 ? "bad" : "ok"} />
        <Stat label="moved on last reshard" value={moved ? `${moved.count}/${moved.total} (${Math.round((moved.count / moved.total) * 100)}%)` : "—"} tone={moved && moved.count / moved.total > 0.5 ? "bad" : "ok"} />
      </div>

      <p className="mt-3 text-[12px] leading-snug text-slate-400">
        {mode === "range" ? (
          workload === "recent" ? (
            <>
              <strong className="text-red-300">Hot shard!</strong>{" "}Range sharding keeps keys ordered, but sequential keys
              (auto-increment ids, timestamps) all fall into the <em>last</em>{" "}range — one shard takes every recent write
              while the others sit idle. Great for range scans, bad for write-heavy sequential keys.
            </>
          ) : (
            <>Range sharding assigns each shard a contiguous slice of the keyspace — so <code>WHERE id BETWEEN …</code>{" "}hits few shards. The risk: uneven or sequential keys overload one shard. Switch the workload to &ldquo;sequential&rdquo; to see it.</>
          )
        ) : (
          <>Hash sharding scatters keys with <code>hash(key) % N</code>, so load stays even for any workload (try &ldquo;sequential&rdquo; — still balanced). The cost: no range scans, and <strong className="text-amber-300">adding a shard remaps almost every key</strong>{" "}(watch &ldquo;moved on last reshard&rdquo; jump). That mass reshuffle is exactly what <a className="text-sky-400 hover:text-sky-300" href="/concepts/consistent-hashing">consistent hashing</a> solves.</>
        )}
      </p>
      <GuidedTour tourId="sharding" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "ok" | "bad" | "neutral" }) {
  const color = tone === "bad" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-slate-200";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
