"use client";

import { useEffect, useRef, useState } from "react";

const MAX_RETRIES = 3;
interface Msg {
  id: number;
  attempts: number;
}
interface Store {
  queue: Msg[];
  dlq: Msg[];
  processed: number;
}

/**
 * RabbitMQ ack / nack / dead-letter flow.
 *
 * The consumer takes the head of the queue. On success it ACKs (message gone).
 * On failure it NACKs → the message is requeued and retried; after MAX_RETRIES
 * it is routed to the Dead Letter Exchange → Dead Letter Queue instead of
 * looping forever (a "poison message").
 */
export function RabbitDeadLetterViz() {
  const seed = (): Store => ({
    queue: [1, 2, 3, 4, 5].map((id) => ({ id, attempts: 0 })),
    dlq: [],
    processed: 0,
  });
  const [store, setStore] = useState<Store>(seed);
  const [healthy, setHealthy] = useState(false);
  const [running, setRunning] = useState(true);
  const [event, setEvent] = useState<string>("Consumer is Failing — watch messages retry, then dead-letter.");

  const storeRef = useRef(store);
  const healthyRef = useRef(healthy);
  const nextId = useRef(6);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);
  useEffect(() => {
    healthyRef.current = healthy;
  }, [healthy]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const prev = storeRef.current;
      if (prev.queue.length === 0) return;
      const head = prev.queue[0];
      const rest = prev.queue.slice(1);
      if (healthyRef.current) {
        setStore({ ...prev, queue: rest, processed: prev.processed + 1 });
        setEvent(`ack ✓ M${head.id} processed`);
        return;
      }
      const attempts = head.attempts + 1;
      if (attempts >= MAX_RETRIES) {
        setStore({ ...prev, queue: rest, dlq: [...prev.dlq, { ...head, attempts }] });
        setEvent(`✗ M${head.id} nacked ${MAX_RETRIES}× → DLX → Dead Letter Queue`);
      } else {
        setStore({ ...prev, queue: [...rest, { ...head, attempts }] });
        setEvent(`✗ M${head.id} nacked (retry ${attempts}/${MAX_RETRIES}) → requeued`);
      }
    }, 800);
    return () => window.clearInterval(id);
  }, [running]);

  const publish = () => {
    setStore((s) => ({ ...s, queue: [...s.queue, { id: nextId.current, attempts: 0 }] }));
    nextId.current += 1;
  };
  const reset = () => {
    setStore(seed());
    setHealthy(false);
    nextId.current = 6;
    setEvent("Consumer is Failing — watch messages retry, then dead-letter.");
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={publish} className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20">
          Publish message
        </button>
        <button
          type="button"
          onClick={() => setHealthy((h) => !h)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${healthy ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}
        >
          Consumer: {healthy ? "Healthy" : "Failing"}
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {/* main queue */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Main queue ({store.queue.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {store.queue.length === 0 ? (
              <span className="text-xs text-slate-600">empty</span>
            ) : (
              store.queue.map((m, i) => (
                <span key={`${m.id}-${i}`} className={`rounded px-2 py-1 text-xs ${i === 0 ? "bg-sky-500/20 text-sky-200" : "bg-slate-800 text-slate-300"}`}>
                  M{m.id}
                  {m.attempts > 0 ? <span className="text-amber-300"> ·{m.attempts}/{MAX_RETRIES}</span> : null}
                </span>
              ))
            )}
          </div>
        </div>

        {/* consumer */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className={`rounded-lg border px-3 py-2 text-center text-xs ${healthy ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            Consumer
            <div className="mt-0.5 text-[10px]">{healthy ? "acks" : "nacks"}</div>
          </div>
          <div className="mt-1 text-[10px] text-emerald-300">✓ {store.processed} done</div>
        </div>

        {/* DLQ */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-amber-400/80">Dead Letter Queue ({store.dlq.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {store.dlq.length === 0 ? (
              <span className="text-xs text-slate-600">empty</span>
            ) : (
              store.dlq.map((m, i) => (
                <span key={`${m.id}-${i}`} className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">
                  M{m.id}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-300">{event}</div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        With the consumer <span className="text-red-300">Failing</span>, each message is retried up to {MAX_RETRIES}{" "}
        times, then dead-lettered so it can&rsquo;t block the queue forever. Flip it to{" "}
        <span className="text-emerald-300">Healthy</span> and the rest drain via acks.
      </p>
    </div>
  );
}
