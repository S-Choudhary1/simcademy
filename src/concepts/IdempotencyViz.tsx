"use client";

import { useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Idempotency", body: "The same request, retried with the same Idempotency-Key (as a flaky network would). Done right, doing it twice equals doing it once." },
  { target: "[data-tour='idem-mode']", title: "Two handlers", body: "A naive handler vs one that stores and checks the idempotency key." },
  { target: "[data-tour='idem-retry']", title: "Retry the same key", body: "Send once, then Retry with the SAME key. Naive creates a second charge; the idempotent handler recognises the key and replays the original response — no new charge." },
  { target: "[data-tour='idem-result']", title: "Count the charges", body: "Idempotent → at most one charge per key. Naive → a double charge, the customer pays twice." },
];

type Mode = "naive" | "idempotent";
const AMOUNT = 100;

interface Charge {
  id: string;
  key: string;
}
interface LogEntry {
  text: string;
  kind: "ok" | "warn";
}

/**
 * Idempotency visualization. The same POST /charges is retried with the same
 * Idempotency-Key (as a network retry would). A naive handler charges twice; an
 * idempotent one recognises the key and replays the original response.
 */
export function IdempotencyViz() {
  const [mode, setMode] = useState<Mode>("idempotent");
  const [key, setKey] = useState("idem_9f2a1b");
  const [charges, setCharges] = useState<Charge[]>([]);
  const [last, setLast] = useState<{ id: string; replayed: boolean } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const store = useRef<Map<string, string>>(new Map());
  const seq = useRef(1000);
  const keySeq = useRef(1);

  const push = (text: string, kind: LogEntry["kind"]) => setLog((l) => [{ text, kind }, ...l].slice(0, 6));

  const send = () => {
    if (mode === "idempotent" && store.current.has(key)) {
      const id = store.current.get(key) as string;
      setLast({ id, replayed: true });
      push(`Idempotency-Key already seen → returned existing ${id}. No new charge.`, "ok");
      return;
    }
    const id = `ch_${seq.current++}`;
    setCharges((c) => [...c, { id, key }]);
    if (mode === "idempotent") store.current.set(key, id);
    setLast({ id, replayed: false });
    push(`Created ${id} for $${AMOUNT}.`, mode === "naive" ? "warn" : "ok");
  };

  const newPayment = () => {
    keySeq.current += 1;
    setKey(`idem_${keySeq.current.toString(16).padStart(6, "0")}`);
    setLast(null);
  };

  const reset = () => {
    store.current.clear();
    seq.current = 1000;
    keySeq.current = 1;
    setKey("idem_9f2a1b");
    setCharges([]);
    setLast(null);
    setLog([]);
  };

  const chargesForKey = charges.filter((c) => c.key === key).length;
  const doubleCharged = chargesForKey > 1;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="idem-mode">
          {(["naive", "idempotent"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                reset();
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                mode === m ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {m === "naive" ? "Naive handler" : "Idempotent handler"}
            </button>
          ))}
        </div>
        <button type="button" onClick={send} className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">
          Send request
        </button>
        <button type="button" onClick={send} data-tour="idem-retry" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20">
          Retry (same key)
        </button>
        <button type="button" onClick={newPayment} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          New payment
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Request</div>
          <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[12px] text-slate-300">
{`POST /v1/charges
Idempotency-Key: ${key}
Content-Type: application/json

{ "amount": ${AMOUNT}, "currency": "usd" }`}
          </pre>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Response</div>
          <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[12px] text-slate-300">
{last
  ? `${last.replayed ? "200 OK (replayed)" : "201 Created"}

{ "id": "${last.id}", "status": "succeeded" }`
  : "— send a request —"}
          </pre>
        </div>
      </div>

      <div
        data-tour="idem-result"
        className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
          doubleCharged
            ? "border-red-500/50 bg-red-500/10 text-red-300"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        }`}
      >
        {doubleCharged
          ? `⚠ Double charge — this key created ${chargesForKey} charges. The customer paid twice.`
          : `Charges for this key: ${chargesForKey}. Each key charges at most once.`}
        <span className="ml-2 text-slate-400">Total charges: {charges.length}</span>
      </div>

      <div className="mt-3 space-y-1 text-xs">
        {log.map((e, i) => (
          <p key={i} className={e.kind === "ok" ? "text-slate-400" : "text-amber-300"}>
            {e.text}
          </p>
        ))}
      </div>
      <GuidedTour tourId="idempotency" steps={TOUR} autoStart={false} />
    </div>
  );
}
