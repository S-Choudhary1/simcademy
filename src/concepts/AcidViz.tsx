"use client";

import { useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "ACID — atomicity", body: "Transfer $100 from A to B. Atomicity means all-or-nothing: a mid-transfer failure must never leave money half-moved." },
  { target: "[data-tour='acid-controls']", title: "Set it up", body: "Choose Transactional (ACID) or Non-transactional, and whether to inject a failure mid-transfer." },
  { target: "[data-tour='acid-transfer']", title: "Run the transfer", body: "Move $100 from A to B and watch the balances." },
  { target: "[data-tour='acid-invariant']", title: "The invariant", body: "Non-transactional + failure: A is debited but B never credited → A + B breaks, money vanishes. ACID rolls the whole thing back, so the total always holds." },
];

const START = 500;
const AMOUNT = 100;

interface LogEntry {
  text: string;
  ok: boolean;
}

/**
 * ACID visualization — atomicity of a money transfer.
 *
 * Transfers $100 from A to B. With a failure injected mid-operation:
 *  - Non-transactional: A is debited but B never credited → money vanishes
 *    (invariant A+B = 1000 is broken).
 *  - Transactional (ACID): the whole thing rolls back → balances unchanged.
 * That contrast is atomicity + consistency, made concrete.
 */
export function AcidViz() {
  const [a, setA] = useState(START);
  const [b, setB] = useState(START);
  const [acid, setAcid] = useState(true);
  const [injectFailure, setInjectFailure] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([]);

  const total = a + b;
  const consistent = total === 2 * START;

  const push = (text: string, ok: boolean) => setLog((l) => [{ text, ok }, ...l].slice(0, 6));

  const transfer = () => {
    if (a < AMOUNT) {
      push("Insufficient funds in Account A.", false);
      return;
    }
    if (acid) {
      if (injectFailure) {
        push("Failure mid-transaction → ROLLBACK. Nothing changed — all-or-nothing.", true);
      } else {
        setA(a - AMOUNT);
        setB(b + AMOUNT);
        push(`Committed: A −$${AMOUNT}, B +$${AMOUNT}.`, true);
      }
    } else {
      // Non-transactional: two independent writes.
      setA(a - AMOUNT);
      if (injectFailure) {
        push(`CRASH after debit! $${AMOUNT} left A but never reached B. Money lost.`, false);
      } else {
        setB(b + AMOUNT);
        push(`A −$${AMOUNT}, then B +$${AMOUNT} (two separate writes).`, true);
      }
    }
  };

  const reset = () => {
    setA(START);
    setB(START);
    setLog([]);
  };

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Account label="Account A" value={a} />
            <Account label="Account B" value={b} />
          </div>
          <div
            data-tour="acid-invariant"
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              consistent
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/50 bg-red-500/10 text-red-300"
            }`}
          >
            {consistent ? (
              <>Invariant holds: A + B = ${total} ✓</>
            ) : (
              <>⚠ Invariant broken: A + B = ${total} (should be ${2 * START}). Money was lost.</>
            )}
          </div>

          <div className="mt-3 space-y-1 text-xs">
            {log.length === 0 ? (
              <p className="text-slate-600">Run a transfer to see what happens.</p>
            ) : (
              log.map((e, i) => (
                <p key={i} className={e.ok ? "text-slate-400" : "text-red-300"}>
                  {e.ok ? "•" : "✕"} {e.text}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3" data-tour="acid-controls">
          <Toggle
            label="Mode"
            options={[
              { v: true, label: "Transactional (ACID)" },
              { v: false, label: "Non-transactional" },
            ]}
            value={acid}
            onChange={setAcid}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={injectFailure}
              onChange={(e) => setInjectFailure(e.target.checked)}
              className="accent-sky-500"
            />
            Inject failure mid-transfer
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={transfer}
              data-tour="acid-transfer"
              className="flex-1 rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Transfer ${AMOUNT} A→B
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] leading-snug text-slate-500">
            Try <span className="text-slate-300">Non-transactional</span> + failure: the invariant breaks. Switch to{" "}
            <span className="text-slate-300">ACID</span>: the rollback keeps it intact.
          </p>
        </div>
      </div>
      <GuidedTour tourId="acid" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Account({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">${value}</div>
    </div>
  );
}

function Toggle<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="inline-flex w-full rounded-lg border border-slate-800 bg-slate-900 p-0.5">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
              value === o.v ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
