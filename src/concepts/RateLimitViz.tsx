"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

/* ================================================================== *
 * Rate limiting — five algorithms fed the SAME deterministic, varying
 * traffic so they're compared fairly. Each algorithm has its OWN real
 * parameters (a leaky bucket's leak rate ≠ a token bucket's refill
 * rate), and each shows its actual implementation as pseudocode.
 * ================================================================== */

const DT = 0.2; // tick length (s)
const WINDOW = 1; // window length (s) for window algorithms
const HIST = 34;

const ALGOS = ["token", "leaky", "fixed", "sliding", "slidingLog"] as const;
type Algo = (typeof ALGOS)[number];

interface AlgoMeta {
  name: string;
  kind: "bucket" | "window";
  desc: string;
  useCase: string;
  params: { key: string; label: string; min: number; max: number; unit: string }[];
  code: string;
}

const META: Record<Algo, AlgoMeta> = {
  token: {
    name: "Token Bucket",
    kind: "bucket",
    desc: "Refills tokens at a steady rate; a full bucket lets a short burst through.",
    useCase: "Public APIs that tolerate brief bursts.",
    params: [
      { key: "refill", label: "refill", min: 1, max: 12, unit: "/s" },
      { key: "capacity", label: "capacity", min: 1, max: 12, unit: "" },
    ],
    code: `# refill R tokens/sec, capacity C (max burst)
tokens = min(C, tokens + R * elapsed)
if tokens >= 1:
    tokens -= 1
    allow()
else:
    reject()`,
  },
  leaky: {
    name: "Leaky Bucket",
    kind: "bucket",
    desc: "Queues arrivals and leaks them at a constant rate — smooths spikes into a steady stream.",
    useCase: "Shaping traffic to a fixed downstream rate.",
    params: [
      { key: "leak", label: "leak rate", min: 1, max: 12, unit: "/s" },
      { key: "capacity", label: "queue size", min: 1, max: 12, unit: "" },
    ],
    code: `# leaks L requests/sec, queue capacity C
level = max(0, level - L * elapsed)   # drip out
if level < C:
    level += 1     # enqueue; leaves at L/sec
    allow()
else:
    reject()       # queue full`,
  },
  fixed: {
    name: "Fixed Window",
    kind: "window",
    desc: "Counts per fixed interval, resets each window. Simple, but allows up to 2× at window edges.",
    useCase: "Simple quotas where edge bursts are OK.",
    params: [{ key: "limit", label: "limit", min: 1, max: 12, unit: "/win" }],
    code: `# limit N per fixed window W
if now - windowStart >= W:
    windowStart = now
    count = 0
if count < N:
    count += 1
    allow()
else:
    reject()`,
  },
  sliding: {
    name: "Sliding Window (counter)",
    kind: "window",
    desc: "Weights the previous window to smooth the fixed-window edge burst. Approximate, O(1) memory.",
    useCase: "Fairer per-user limits, cheap to store.",
    params: [{ key: "limit", label: "limit", min: 1, max: 12, unit: "/win" }],
    code: `# weighted estimate across the window edge
elapsed = (now - windowStart) / W
estimate = prevCount * (1 - elapsed) + count
if estimate < N:
    count += 1
    allow()
else:
    reject()`,
  },
  slidingLog: {
    name: "Sliding Window (log)",
    kind: "window",
    desc: "Exact: keeps a timestamp per admitted request in the last window. Precise, but O(N) memory.",
    useCase: "When exactness matters more than memory.",
    params: [{ key: "limit", label: "limit", min: 1, max: 12, unit: "/win" }],
    code: `# exact: log timestamps of allowed requests
drop timestamps older than (now - W)
if len(log) < N:
    log.append(now)
    allow()
else:
    reject()`,
  },
};

type Config = Record<Algo, Record<string, number>>;
const DEFAULT_CFG: Config = {
  token: { refill: 5, capacity: 5 },
  leaky: { leak: 5, capacity: 5 },
  fixed: { limit: 5 },
  sliding: { limit: 5 },
  slidingLog: { limit: 5 },
};

// Deterministic value-noise: integer → [0,1). Pure (no Math.random).
function noise(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

interface AlgoView { admitted: number; rejected: number; hist: number[]; level: number; windowCount: number; cap: number }
const initView = (cfg: Config): Record<Algo, AlgoView> => ({
  token: { admitted: 0, rejected: 0, hist: [], level: cfg.token.capacity, windowCount: 0, cap: cfg.token.capacity },
  leaky: { admitted: 0, rejected: 0, hist: [], level: 0, windowCount: 0, cap: cfg.leaky.capacity },
  fixed: { admitted: 0, rejected: 0, hist: [], level: 0, windowCount: 0, cap: cfg.fixed.limit },
  sliding: { admitted: 0, rejected: 0, hist: [], level: 0, windowCount: 0, cap: cfg.sliding.limit },
  slidingLog: { admitted: 0, rejected: 0, hist: [], level: 0, windowCount: 0, cap: cfg.slidingLog.limit },
});

const TOUR: TourStep[] = [
  { title: "Rate limiting", body: "The SAME varying traffic is fed to five algorithms at once, so you can compare how each admits or rejects — especially under a burst." },
  { target: "[data-tour='rl-traffic']", title: "Shared traffic", body: "One deterministic, time-varying arrival stream drives every algorithm, so the comparison is always apples-to-apples." },
  { target: "[data-tour='rl-token']", title: "Real, per-algorithm params", body: "Each algorithm has its own knobs — a leaky bucket's leak rate is separate from a token bucket's refill rate. Change them and watch the bucket react." },
  { target: "[data-tour='rl-code']", title: "How to implement it", body: "Hit </> on any card to see clean pseudocode for that exact algorithm." },
  { target: "[data-tour='rl-algos']", title: "Compare", body: "Send a burst and watch the five diverge on identical traffic — each shows % admitted and what it's best for." },
];

export function RateLimitViz() {
  const [running, setRunning] = useState(true);
  const [rate, setRate] = useState(6); // avg arrivals / s (shared traffic)
  const [cfg, setCfg] = useState<Config>(DEFAULT_CFG);
  const [view, setView] = useState<Record<Algo, AlgoView>>(() => initView(DEFAULT_CFG));
  const [arrivalsNow, setArrivalsNow] = useState(0);
  const [openCode, setOpenCode] = useState<Algo | null>(null);

  const rateRef = useRef(rate);
  const cfgRef = useRef(cfg);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  const clock = useRef(0);
  const acc = useRef(0);
  const burst = useRef(0);
  const tb = useRef({ tokens: 5 });
  const lk = useRef({ level: 0 });
  const fw = useRef({ start: 0, count: 0 });
  const sw = useRef({ start: 0, count: 0, prev: 0 });
  const slog = useRef<number[]>([]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      clock.current += DT;
      const now = clock.current;
      const c = cfgRef.current;

      // shared deterministic traffic: lambda varies each second in [0.4x, 2x]
      const lambda = rateRef.current * (0.4 + 1.6 * noise(Math.floor(now)));
      acc.current += lambda * DT;
      let arrivals = Math.floor(acc.current);
      acc.current -= arrivals;
      arrivals += burst.current;
      burst.current = 0;
      setArrivalsNow(arrivals);

      // refill / leak / roll windows / trim log
      tb.current.tokens = Math.min(c.token.capacity, tb.current.tokens + c.token.refill * DT);
      lk.current.level = Math.max(0, lk.current.level - c.leaky.leak * DT);
      if (now - fw.current.start >= WINDOW) { fw.current.start = now; fw.current.count = 0; }
      if (now - sw.current.start >= WINDOW) { sw.current.prev = sw.current.count; sw.current.count = 0; sw.current.start = now; }
      slog.current = slog.current.filter((t) => t > now - WINDOW);

      const adm: Record<Algo, number> = { token: 0, leaky: 0, fixed: 0, sliding: 0, slidingLog: 0 };
      const rej: Record<Algo, number> = { token: 0, leaky: 0, fixed: 0, sliding: 0, slidingLog: 0 };
      for (let i = 0; i < arrivals; i++) {
        if (tb.current.tokens >= 1) { tb.current.tokens -= 1; adm.token++; } else rej.token++;
        if (lk.current.level < c.leaky.capacity) { lk.current.level += 1; adm.leaky++; } else rej.leaky++;
        if (fw.current.count < c.fixed.limit) { fw.current.count++; adm.fixed++; } else rej.fixed++;
        const elapsed = Math.min(1, (now - sw.current.start) / WINDOW);
        const weighted = sw.current.prev * (1 - elapsed) + sw.current.count;
        if (weighted < c.sliding.limit) { sw.current.count++; adm.sliding++; } else rej.sliding++;
        if (slog.current.length < c.slidingLog.limit) { slog.current.push(now); adm.slidingLog++; } else rej.slidingLog++;
      }

      const elapsedSw = Math.min(1, (now - sw.current.start) / WINDOW);
      const swWeighted = sw.current.prev * (1 - elapsedSw) + sw.current.count;

      setView((prev) => {
        const next = {} as Record<Algo, AlgoView>;
        for (const a of ALGOS) {
          const capNow = a === "token" ? c.token.capacity : a === "leaky" ? c.leaky.capacity : (c[a] as { limit: number }).limit;
          next[a] = {
            admitted: prev[a].admitted + adm[a],
            rejected: prev[a].rejected + rej[a],
            hist: [...prev[a].hist, adm[a]].slice(-HIST),
            level: a === "token" ? tb.current.tokens : a === "leaky" ? lk.current.level : prev[a].level,
            windowCount: a === "fixed" ? fw.current.count : a === "sliding" ? swWeighted : a === "slidingLog" ? slog.current.length : 0,
            cap: capNow,
          };
        }
        return next;
      });
    }, DT * 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const setParam = (algo: Algo, key: string, value: number) =>
    setCfg((prev) => ({ ...prev, [algo]: { ...prev[algo], [key]: value } }));

  const reset = () => {
    clock.current = 0; acc.current = 0; burst.current = 0;
    tb.current = { tokens: cfg.token.capacity };
    lk.current = { level: 0 };
    fw.current = { start: 0, count: 0 };
    sw.current = { start: 0, count: 0, prev: 0 };
    slog.current = [];
    setView(initView(cfg));
    setArrivalsNow(0);
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => (burst.current += 20)} className="rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-sm font-medium text-fuchsia-300 hover:bg-fuchsia-500/20">⚡ Send burst (20)</button>
        <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">{running ? "❚❚ Pause" : "▶ Play"}</button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
        <label className="ml-1 flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-400">Avg arrivals</span>
          <input type="range" min={1} max={20} step={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-28 accent-sky-500" />
          <span className="w-10 tabular-nums text-slate-400">{rate}/s</span>
        </label>
      </div>

      {/* shared traffic readout */}
      <div className="mb-3 flex items-center gap-2 text-[12px]" data-tour="rl-traffic">
        <span className="text-slate-500">Shared traffic this tick:</span>
        <span className="font-mono font-semibold text-slate-200">{arrivalsNow}</span>
        <span className="text-slate-600">req — one deterministic, varying stream feeds all five algorithms</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" data-tour="rl-algos">
        {ALGOS.map((a) => {
          const m = META[a];
          const s = view[a];
          const total = s.admitted + s.rejected;
          const pct = total > 0 ? Math.round((s.admitted / total) * 100) : 100;
          return (
            <div key={a} data-tour={a === "token" ? "rl-token" : undefined} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-semibold text-slate-100">{m.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-slate-400">{pct}% admitted</span>
                  <button type="button" onClick={() => setOpenCode(openCode === a ? null : a)} data-tour={a === "token" ? "rl-code" : undefined} className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${openCode === a ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:text-white"}`} title="Show implementation">&lt;/&gt;</button>
                </div>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{m.desc}</p>

              {openCode === a ? (
                <pre className="mt-2 overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-2 text-[11px] leading-snug text-slate-300">{m.code}</pre>
              ) : null}

              {/* per-algorithm params */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {m.params.map((p) => (
                  <Stepper key={p.key} label={p.label} value={cfg[a][p.key]} min={p.min} max={p.max} unit={p.unit} onChange={(v) => setParam(a, p.key, v)} />
                ))}
              </div>

              <div className="mt-2 flex items-end gap-3">
                {m.kind === "bucket" ? (
                  <Bucket algo={a} level={s.level} cap={s.cap} rate={a === "token" ? cfg.token.refill : cfg.leaky.leak} />
                ) : (
                  <Gauge count={s.windowCount} limit={s.cap} />
                )}
                <div className="flex h-14 flex-1 items-end gap-0.5">
                  {s.hist.map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-emerald-500/70" style={{ height: `${Math.min(100, (v / Math.max(1, rate)) * 100)}%`, minHeight: v > 0 ? 2 : 0 }} title={`${v} admitted`} />
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="tabular-nums text-emerald-300">✓ {s.admitted} admitted</span>
                <span className="tabular-nums text-red-300">✕ {s.rejected} rejected</span>
              </div>
              <p className="mt-1 text-[11px] text-sky-300"><span className="font-semibold">Best for:</span> {m.useCase}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        Every algorithm sees the <strong className="text-slate-300">same traffic</strong>, but each has its own real
        parameters. Give the leaky bucket a slow <span className="text-slate-300">leak rate</span> and it queues then
        rejects; raise the token bucket&rsquo;s <span className="text-slate-300">capacity</span> and it absorbs bigger
        bursts. Hit <span className="font-mono text-slate-300">&lt;/&gt;</span> on any card for its implementation.
      </p>

      <GuidedTour tourId="rate-limiting" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Stepper({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-slate-400">
      <span>{label}</span>
      <div className="inline-flex items-center overflow-hidden rounded border border-slate-700">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="bg-slate-800 px-1.5 leading-none text-slate-300 hover:text-white">−</button>
        <span className="w-8 text-center font-mono tabular-nums text-slate-200">{value}{unit}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="bg-slate-800 px-1.5 leading-none text-slate-300 hover:text-white">+</button>
      </div>
    </div>
  );
}

function Bucket({ algo, level, cap, rate }: { algo: Algo; level: number; cap: number; rate: number }) {
  const pct = Math.max(0, Math.min(1, level / Math.max(1, cap)));
  const isToken = algo === "token";
  const fill = isToken ? "#38bdf8" : "#22d3ee";
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-9 overflow-hidden rounded-b-md border-2 border-t-0 border-slate-600 bg-slate-950">
        <div className="absolute inset-x-0 bottom-0 transition-[height] duration-150" style={{ height: `${pct * 100}%`, background: `${fill}cc` }} />
        {Array.from({ length: Math.max(0, cap - 1) }, (_, i) => (
          <div key={i} className="absolute inset-x-0 border-t border-slate-700/50" style={{ bottom: `${((i + 1) / cap) * 100}%` }} />
        ))}
      </div>
      <div className="mt-1 text-center font-mono text-[10px] text-slate-400">{level.toFixed(1)}/{cap}</div>
      <div className="text-[9px] text-slate-600">{isToken ? `refill ${rate}/s` : `leak ${rate}/s`}</div>
    </div>
  );
}

function Gauge({ count, limit }: { count: number; limit: number }) {
  const pct = Math.max(0, Math.min(1, count / Math.max(1, limit)));
  const over = count >= limit;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-9 overflow-hidden rounded-md border-2 border-slate-600 bg-slate-950">
        <div className="absolute inset-x-0 bottom-0 transition-[height] duration-150" style={{ height: `${pct * 100}%`, background: over ? "#f87171cc" : "#a78bfacc" }} />
      </div>
      <div className="mt-1 text-center font-mono text-[10px] text-slate-400">{count.toFixed(1)}/{limit}</div>
      <div className="text-[9px] text-slate-600">window</div>
    </div>
  );
}
