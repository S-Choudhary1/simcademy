"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Connection pooling", body: "Requests borrow one of a fixed set of DB connections for the duration of a query. If all are busy, they wait — and can time out." },
  { target: "[data-tour='cp-requests']", title: "Incoming load", body: "The query rate. Push it above what the pool can serve (pool size ÷ query time) to stress it." },
  { target: "[data-tour='cp-pool']", title: "Pool size", body: "How many connections exist. Bigger drains the queue — but too many just move the overload onto the database. The pool exists to bound concurrency." },
  { target: "[data-tour='cp-slots']", title: "Connections", body: "Each slot is a connection; the fill is a query in flight. When all are busy, new requests can't get one." },
  { target: "[data-tour='cp-queue']", title: "Queue & timeouts", body: "Overflow requests wait here. Wait past the timeout and they fail — that's pool exhaustion." },
];

const SERVICE_MS = 600; // how long a query holds a connection
const TIMEOUT_MS = 2500; // how long a request waits before giving up
const DT = 150;

interface Store {
  conns: number[]; // ms remaining per connection (0 = free)
  waiting: number[]; // ms each queued request has waited
  served: number;
  timedOut: number;
}

/**
 * Database connection pool. Requests must borrow one of a fixed set of
 * connections for the duration of a query. If all are busy, requests wait in a
 * queue; wait too long and they time out (pool exhaustion). A bigger pool drains
 * the queue — but too many connections overwhelms the database itself.
 */
export function ConnectionPoolViz() {
  const [store, setStore] = useState<Store>({ conns: Array(6).fill(0), waiting: [], served: 0, timedOut: 0 });
  const [rate, setRate] = useState(12);
  const [running, setRunning] = useState(true);
  const rateRef = useRef(rate);
  const acc = useRef(0);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setStore((prev) => {
        const conns = [...prev.conns];
        let served = prev.served;
        let timedOut = prev.timedOut;
        for (let i = 0; i < conns.length; i++) {
          if (conns[i] > 0) {
            const nv = conns[i] - DT;
            if (nv <= 0) {
              conns[i] = 0;
              served += 1;
            } else conns[i] = nv;
          }
        }
        const waiting = prev.waiting
          .map((w) => w + DT)
          .filter((w) => {
            if (w > TIMEOUT_MS) {
              timedOut += 1;
              return false;
            }
            return true;
          });
        for (let i = 0; i < conns.length && waiting.length > 0; i++) {
          if (conns[i] === 0) {
            conns[i] = SERVICE_MS;
            waiting.shift();
          }
        }
        acc.current += rateRef.current * (DT / 1000);
        let arrivals = Math.floor(acc.current);
        acc.current -= arrivals;
        for (; arrivals > 0; arrivals--) {
          const free = conns.findIndex((c) => c === 0);
          if (free >= 0) conns[free] = SERVICE_MS;
          else waiting.push(0);
        }
        return { conns, waiting, served, timedOut };
      });
    }, DT);
    return () => window.clearInterval(id);
  }, [running]);

  const resize = (size: number) => setStore((s) => ({ ...s, conns: Array.from({ length: size }, (_, i) => s.conns[i] ?? 0) }));
  const reset = () => {
    setStore({ conns: Array(6).fill(0), waiting: [], served: 0, timedOut: 0 });
    setRate(12);
    acc.current = 0;
  };

  const inUse = store.conns.filter((c) => c > 0).length;
  const poolSize = store.conns.length;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300" data-tour="cp-requests">
          <span className="text-slate-400">Requests</span>
          <input type="range" min={1} max={40} step={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-28 accent-sky-500" />
          <span className="w-12 tabular-nums text-slate-400">{rate}/s</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300" data-tour="cp-pool">
          <span className="text-slate-400">Pool</span>
          <input type="range" min={1} max={16} step={1} value={poolSize} onChange={(e) => resize(Number(e.target.value))} className="w-28 accent-sky-500" />
          <span className="w-8 tabular-nums text-slate-400">{poolSize}</span>
        </label>
      </div>

      {/* pool slots */}
      <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Connection pool ({inUse}/{poolSize} in use)</div>
      <div className="flex flex-wrap gap-1.5" data-tour="cp-slots">
        {store.conns.map((c, i) => (
          <div key={i} className={`relative h-9 w-9 overflow-hidden rounded border ${c > 0 ? "border-sky-500/50 bg-slate-900" : "border-slate-800 bg-slate-950"}`} title={c > 0 ? "busy" : "free"}>
            {c > 0 ? <div className="absolute bottom-0 left-0 right-0 bg-sky-500/50" style={{ height: `${(c / SERVICE_MS) * 100}%` }} /> : null}
          </div>
        ))}
      </div>

      {/* waiting queue */}
      <div className="mt-3" data-tour="cp-queue">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Waiting queue ({store.waiting.length})</div>
        <div className="flex h-6 flex-wrap gap-1">
          {store.waiting.slice(0, 40).map((w, i) => (
            <div key={i} className={`h-3 w-3 rounded-full ${w > TIMEOUT_MS * 0.6 ? "bg-red-400" : "bg-amber-400"}`} />
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="In use" value={`${inUse}/${poolSize}`} />
        <Stat label="Waiting" value={`${store.waiting.length}`} tone={store.waiting.length > 0 ? "warn" : "ok"} />
        <Stat label="Served" value={store.served.toLocaleString()} />
        <Stat label="Timed out" value={store.timedOut.toLocaleString()} tone={store.timedOut > 0 ? "bad" : "ok"} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Push Requests above what the pool can serve (pool × 1/query-time) and the queue fills and requests start timing
        out — pool exhaustion. Raise the pool to drain it. But a huge pool just moves the overload onto the database:
        the pool exists to <em>bound</em>{" "}concurrency.
      </p>
      <GuidedTour tourId="connection-pool" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Stat({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-slate-100";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
