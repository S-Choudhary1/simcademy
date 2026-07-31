"use client";

import { useState } from "react";

type Policy = "LRU" | "LFU" | "random";
const CAP = 6;
const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface Entry {
  key: string;
  lastAccess: number;
  freq: number;
}

/**
 * Redis eviction. A fixed-capacity cache; when it's full, admitting a new key
 * evicts a victim chosen by the policy — LRU (least recently used), LFU (least
 * frequently used), or random. Access keys and watch what gets evicted and how
 * the hit ratio moves.
 */
export function RedisEvictionViz() {
  const [cache, setCache] = useState<Entry[]>([]);
  const [policy, setPolicy] = useState<Policy>("LRU");
  const [clock, setClock] = useState(1);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [event, setEvent] = useState<string | null>(null);

  // Pure: the deterministic victim for LRU/LFU (used both in render and on access).
  const victimIndex = (entries: Entry[]): number => {
    if (policy === "LFU") {
      return entries.reduce((mi, e, i, a) => (e.freq < a[mi].freq || (e.freq === a[mi].freq && e.lastAccess < a[mi].lastAccess) ? i : mi), 0);
    }
    return entries.reduce((mi, e, i, a) => (e.lastAccess < a[mi].lastAccess ? i : mi), 0); // LRU
  };

  const access = (key: string) => {
    const t = clock;
    setClock(t + 1);
    const idx = cache.findIndex((e) => e.key === key);
    if (idx >= 0) {
      setCache((c) => c.map((e) => (e.key === key ? { ...e, lastAccess: t, freq: e.freq + 1 } : e)));
      setHits((h) => h + 1);
      setEvent(`HIT ${key}`);
      return;
    }
    setMisses((m) => m + 1);
    let victim: string | null = null;
    let next = [...cache];
    if (next.length >= CAP) {
      // "random" rotates deterministically off the access clock (pure — no Math.random).
      const vi = policy === "random" ? t % next.length : victimIndex(next);
      victim = next[vi].key;
      next = next.filter((_, i) => i !== vi);
    }
    next = [...next, { key, lastAccess: t, freq: 1 }];
    setCache(next);
    setEvent(victim ? `MISS ${key} → cache full → evicted ${victim} (${policy})` : `MISS ${key} → cached`);
  };

  const reset = () => {
    setCache([]);
    setClock(1);
    setHits(0);
    setMisses(0);
    setEvent(null);
  };

  const total = hits + misses;
  const ratio = total > 0 ? Math.round((hits / total) * 100) : 0;
  const nextOut = cache.length >= CAP && policy !== "random" ? cache[victimIndex(cache)].key : null;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          {(["LRU", "LFU", "random"] as Policy[]).map((pl) => (
            <button key={pl} type="button" onClick={() => setPolicy(pl)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${policy === pl ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>
              {pl}
            </button>
          ))}
        </div>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
        <span className="ml-auto text-sm text-slate-400">
          capacity {cache.length}/{CAP} · <span className="text-emerald-300">{hits} hits</span> ·{" "}
          <span className="text-amber-300">{misses} misses</span> · {ratio}%
        </span>
      </div>

      {/* cache slots */}
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: CAP }, (_, i) => {
          const e = cache[i];
          const isNextOut = e && e.key === nextOut;
          return (
            <div
              key={i}
              className={`rounded-lg border p-2 text-center ${
                e ? (isNextOut ? "border-amber-500/60 bg-amber-500/10" : "border-slate-700 bg-slate-900") : "border-dashed border-slate-800 bg-slate-950"
              }`}
            >
              <div className="text-lg font-bold text-slate-100">{e ? e.key : "·"}</div>
              <div className="text-[9px] tabular-nums text-slate-500">
                {e ? (policy === "LFU" ? `×${e.freq}` : `t${e.lastAccess}`) : "empty"}
              </div>
              {isNextOut ? <div className="text-[8px] font-semibold text-amber-300">next out</div> : null}
            </div>
          );
        })}
      </div>

      {/* access buttons */}
      <div className="mt-3">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">GET a key</div>
        <div className="flex flex-wrap gap-1.5">
          {KEYS.map((k) => {
            const inCache = cache.some((e) => e.key === k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => access(k)}
                className={`h-8 w-8 rounded-md border text-sm font-semibold ${
                  inCache ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {k}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-300">
        {event ?? "Access keys — green keys are already cached (hits); grey are misses that load in and may evict."}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        <strong>t</strong> = last-access time (LRU evicts the smallest), <strong>×n</strong> = access count (LFU evicts
        the smallest). Fill the cache, then GET a new key to trigger an eviction — try the same policy with a
        repeated-key pattern vs a scan to see LRU and LFU diverge.
      </p>
    </div>
  );
}
