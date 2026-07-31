"use client";

import { useRef, useState } from "react";

const PATHS = ["/home", "/pricing", "/docs", "/blog"];
interface Upstream {
  name: string;
  healthy: boolean;
  served: number;
}

/**
 * Nginx as a caching reverse proxy. A request either HITs the Nginx cache
 * (served instantly, no upstream touched) or MISSes and is forwarded to a
 * healthy upstream (round-robin), whose response is then cached. Health checks
 * skip down upstreams; if all are down, Nginx returns 502.
 */
export function NginxCacheViz() {
  const [cache, setCache] = useState<string[]>([]);
  const [upstreams, setUpstreams] = useState<Upstream[]>([
    { name: "App A", healthy: true, served: 0 },
    { name: "App B", healthy: true, served: 0 },
    { name: "App C", healthy: true, served: 0 },
  ]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [event, setEvent] = useState<string | null>(null);
  const rr = useRef(0);

  const request = (path: string) => {
    if (cache.includes(path)) {
      setHits((h) => h + 1);
      setEvent(`HIT ${path} — served from the Nginx cache (no upstream hit).`);
      return;
    }
    const healthyList = upstreams.map((u, i) => ({ u, i })).filter((x) => x.u.healthy);
    if (healthyList.length === 0) {
      setMisses((m) => m + 1);
      setEvent(`✗ 502 Bad Gateway — ${path} missed the cache and every upstream is down.`);
      return;
    }
    const pick = healthyList[rr.current % healthyList.length];
    rr.current += 1;
    setUpstreams((us) => us.map((u, i) => (i === pick.i ? { ...u, served: u.served + 1 } : u)));
    setCache((c) => [...c, path]);
    setMisses((m) => m + 1);
    setEvent(`MISS ${path} → routed to ${pick.u.name} → response cached.`);
  };

  const toggleHealth = (i: number) => setUpstreams((us) => us.map((u, idx) => (idx === i ? { ...u, healthy: !u.healthy } : u)));
  const clearCache = () => {
    setCache([]);
    setEvent("Cache cleared — the next request for each path will MISS.");
  };
  const reset = () => {
    setCache([]);
    setUpstreams((us) => us.map((u) => ({ ...u, healthy: true, served: 0 })));
    setHits(0);
    setMisses(0);
    rr.current = 0;
    setEvent(null);
  };

  const total = hits + misses;
  const ratio = total > 0 ? Math.round((hits / total) * 100) : 0;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* nginx cache */}
      <div className="mb-3 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-100">Nginx · proxy cache</span>
          <span className="text-xs text-slate-400">
            <span className="text-emerald-300">{hits} hits</span> · <span className="text-amber-300">{misses} misses</span> · {ratio}%
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cache.length === 0 ? (
            <span className="text-xs text-slate-500">cache empty</span>
          ) : (
            cache.map((c, i) => (
              <span key={`${c}-${i}`} className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-200">
                {c}
              </span>
            ))
          )}
        </div>
      </div>

      {/* upstreams */}
      <div className="grid grid-cols-3 gap-2">
        {upstreams.map((u, i) => (
          <div key={u.name} className={`rounded-lg border p-2 text-center ${u.healthy ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10 opacity-70"}`}>
            <div className="text-xs font-semibold text-slate-100">{u.name}</div>
            <div className={`text-[10px] ${u.healthy ? "text-emerald-300" : "text-red-300"}`}>{u.healthy ? "healthy" : "DOWN"}</div>
            <div className="text-[10px] tabular-nums text-slate-500">served {u.served}</div>
            <button type="button" onClick={() => toggleHealth(i)} className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">
              {u.healthy ? "take down" : "bring up"}
            </button>
          </div>
        ))}
      </div>

      {/* request buttons */}
      <div className="mt-3">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">GET a path</div>
        <div className="flex flex-wrap gap-1.5">
          {PATHS.map((path) => {
            const cached = cache.includes(path);
            return (
              <button
                key={path}
                type="button"
                onClick={() => request(path)}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-xs ${cached ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
              >
                {path}
              </button>
            );
          })}
          <button type="button" onClick={clearCache} className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            Clear cache
          </button>
          <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-300">
        {event ?? "Request a path twice: the first MISSes to an upstream, the second HITs the cache. Take upstreams down to see health-checked routing."}
      </div>
    </div>
  );
}
