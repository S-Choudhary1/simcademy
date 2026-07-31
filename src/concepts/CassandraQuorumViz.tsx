"use client";

import { useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

/* ================================================================== *
 * Cassandra tunable consistency. A key is replicated to N nodes (RF).
 * A write waits for W replicas to ack; a read queries R replicas and
 * takes the newest. When R + W > N the read and write quorums are
 * guaranteed to OVERLAP, so a read always sees the latest write (strong).
 * Otherwise a read can miss it (eventual).
 *
 * Modelled deterministically: the latest write (v2) lands on the first
 * W nodes; a read queries the last R nodes. They overlap iff W + R > N.
 * ================================================================== */

const N = 5; // replication factor
const CONS = (v: number) => (v === 1 ? "ONE" : v === N ? "ALL" : v === Math.ceil((N + 1) / 2) ? "QUORUM" : `${v}`);

const TOUR: TourStep[] = [
  { title: "Cassandra: tunable consistency", body: "A row is replicated to N nodes. You choose how many must respond on writes (W) and reads (R) — trading consistency for latency/availability, per query." },
  { target: "[data-tour='cq-w']", title: "Write consistency (W)", body: "How many replicas must acknowledge a write. The latest value (v2) lands on those nodes." },
  { target: "[data-tour='cq-r']", title: "Read consistency (R)", body: "How many replicas a read contacts. It returns the newest value among them." },
  { target: "[data-tour='cq-ring']", title: "The replicas", body: "Green = has the latest write; the outlined nodes are the ones this read queries. Overlap (bright green) means the read is guaranteed to see the latest write." },
  { target: "[data-tour='cq-verdict']", title: "R + W > N", body: "When read and write quorums overlap, reads are strongly consistent. Otherwise a read can return stale data — eventual consistency." },
];

export function CassandraQuorumViz() {
  const [w, setW] = useState(3);
  const [r, setR] = useState(3);

  const writeSet = new Set(Array.from({ length: w }, (_, i) => i)); // first W nodes get v2
  const readSet = new Set(Array.from({ length: r }, (_, i) => N - 1 - i)); // last R nodes queried
  const overlap = [...readSet].filter((i) => writeSet.has(i));
  const strong = w + r > N;
  const readSeesLatest = overlap.length > 0; // equivalent to strong given the deterministic layout

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-4 flex flex-wrap gap-5">
        <Chooser label="Write (W)" value={w} onChange={setW} tone="emerald" tour="cq-w" />
        <Chooser label="Read (R)" value={r} onChange={setR} tone="fuchsia" tour="cq-r" />
        <div className="text-sm text-slate-400">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Replication</div>
          <div className="font-mono text-slate-200">N = {N}</div>
        </div>
      </div>

      {/* replicas */}
      <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500" data-tour="cq-ring">Replicas — green = has latest write (v2) · outlined = queried by this read</div>
      <div className="mb-3 flex flex-wrap gap-2">
        {Array.from({ length: N }, (_, i) => {
          const hasLatest = writeSet.has(i);
          const queried = readSet.has(i);
          const isOverlap = hasLatest && queried;
          return (
            <div
              key={i}
              className={`w-24 rounded-lg border-2 p-2 text-center ${queried ? "border-fuchsia-400" : "border-transparent"} ${isOverlap ? "bg-emerald-500/25" : hasLatest ? "bg-emerald-500/10" : "bg-slate-900"}`}
            >
              <div className="text-[10px] uppercase tracking-wide text-slate-500">node {i + 1}</div>
              <div className={`font-mono text-lg font-bold ${hasLatest ? "text-emerald-300" : "text-slate-400"}`}>{hasLatest ? "v2" : "v1"}</div>
              {queried ? <div className="text-[9px] text-fuchsia-300">read here</div> : <div className="text-[9px] text-slate-700">—</div>}
            </div>
          );
        })}
      </div>

      {/* verdict */}
      <div data-tour="cq-verdict" className={`rounded-lg border px-3 py-2 text-sm ${strong ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-amber-500/40 bg-amber-500/10 text-amber-200"}`}>
        <span className="font-mono">W + R = {w} + {r} = {w + r}</span> {strong ? ">" : "≤"} N ({N}) →{" "}
        <strong>{strong ? "strongly consistent" : "eventually consistent"}</strong>.{" "}
        {readSeesLatest
          ? `The read quorum overlaps the write quorum on ${overlap.length} node${overlap.length === 1 ? "" : "s"}, so it always sees v2 (the latest).`
          : "The read quorum misses every node that has v2 — this read returns stale v1."}
      </div>

      <p className="mt-3 text-[12px] leading-snug text-slate-400">
        This is Cassandra&rsquo;s superpower: consistency is a <strong>per-query</strong> dial, not a fixed property. Want
        speed and availability? Use <code>ONE</code>. Need to read your own writes? Pick W and R so that{" "}
        <strong>R + W &gt; N</strong> (e.g. <code>QUORUM</code> reads and writes). Under a partition, a lower quorum keeps
        you available (AP); a higher one keeps you consistent (CP).
      </p>

      <GuidedTour tourId="cassandra-quorum" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Chooser({ label, value, onChange, tone, tour }: { label: string; value: number; onChange: (n: number) => void; tone: "emerald" | "fuchsia"; tour: string }) {
  const active = tone === "emerald" ? "bg-emerald-500 text-slate-950" : "bg-fuchsia-500 text-slate-950";
  return (
    <div data-tour={tour}>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="inline-flex overflow-hidden rounded-md border border-slate-700">
        {Array.from({ length: N }, (_, i) => i + 1).map((v) => (
          <button key={v} type="button" onClick={() => onChange(v)} className={`px-2.5 py-1.5 text-xs font-semibold ${value === v ? active : "bg-slate-900 text-slate-300 hover:text-white"}`} title={CONS(v)}>
            {v}
          </button>
        ))}
      </div>
      <div className="mt-0.5 text-center text-[10px] text-slate-500">{CONS(value)}</div>
    </div>
  );
}
