"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "Kafka internals", body: "Watch partitions, offsets, consumer groups, and rebalancing in one place. Here's how to drive it." },
  { target: "[data-tour='kafka-play']", title: "Run it", body: "Play/Pause. The producer appends records to partitions; each consumer group advances its own committed offset." },
  { target: "[data-tour='kafka-topic']", title: "Partitions & offsets", body: "Each row is an append-only log. The amber bar is produced records; each group column shows its committed offset and lag (records still to read)." },
  { target: "[data-tour='kafka-partitions']", title: "Add / remove partitions", body: "Partitions are the unit of parallelism. Add one for capacity; try removing one to see why Kafka can't shrink a live topic (it resets offsets)." },
  { target: "[data-tour='kafka-groups']", title: "Consumer groups", body: "Add a group and it reads the whole topic independently, at its own offset — that's how one event feeds many services." },
  { target: "[data-tour='kafka-consumers']", title: "Consumers & rebalancing", body: "Inside a group, add consumers to split the partitions (a rebalance). Go past the partition count and the extra consumer sits idle — parallelism is capped by partitions." },
];

/* ================================================================== *
 * Kafka internals — partitions, offsets, consumer groups, rebalancing.
 *
 *  • A topic has N partitions; each partition is an append-only log where
 *    every record gets a monotonic OFFSET (0,1,2,…). Order holds only
 *    WITHIN a partition.
 *  • A CONSUMER GROUP reads the whole topic and tracks its OWN committed
 *    offset per partition — independent of every other group.
 *  • Within a group, each partition is owned by exactly ONE consumer.
 *    Adding/removing a consumer triggers a REBALANCE (reassignment);
 *    committed offsets survive it. Consumers beyond the partition count
 *    sit idle — partitions cap parallelism.
 *  • You can ADD partitions live; Kafka can't shrink a topic in place
 *    (that needs a recreate, which resets offsets) — modelled honestly.
 * ================================================================== */

const MAX_PARTITIONS = 6;
const MAX_GROUPS = 3;
const CONSUME_PER_TICK = 4; // records one consumer applies per tick, per tick

interface Group {
  name: string;
  consumers: number; // c1..cN
  committed: number[]; // committed offset per partition (this group's own)
}

const PALETTE = [
  { key: "analytics", color: "#34d399", ring: "border-emerald-500/50", text: "text-emerald-300", bg: "bg-emerald-500/10" },
  { key: "billing", color: "#38bdf8", ring: "border-sky-500/50", text: "text-sky-300", bg: "bg-sky-500/10" },
  { key: "search", color: "#f472b6", ring: "border-fuchsia-500/50", text: "text-fuchsia-300", bg: "bg-fuchsia-500/10" },
];

const ownedBy = (partition: number, consumers: number) => partition % consumers;
const partitionsOf = (consumerIdx: number, consumers: number, nP: number) =>
  Array.from({ length: nP }, (_, i) => i).filter((i) => ownedBy(i, consumers) === consumerIdx);

export function KafkaInternalsViz() {
  const [heads, setHeads] = useState<number[]>(() => [0, 0, 0]);
  const [groups, setGroups] = useState<Group[]>(() => [{ name: "analytics", consumers: 2, committed: [0, 0, 0] }]);
  const [rate, setRate] = useState(6);
  const [running, setRunning] = useState(true);
  const [events, setEvents] = useState<string[]>([]);

  const headsRef = useRef(heads);
  const groupsRef = useRef(groups);
  const rateRef = useRef(rate);
  const cursor = useRef(0);
  useEffect(() => { headsRef.current = heads; }, [heads]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { rateRef.current = rate; }, [rate]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const p = headsRef.current.length;
      const r = rateRef.current;
      const start = cursor.current;
      const nextHeads = headsRef.current.slice();
      for (let k = 0; k < r; k++) nextHeads[(start + k) % p] += 1;
      const nextGroups = groupsRef.current.map((g) => {
        const committed = g.committed.slice();
        for (let j = 0; j < g.consumers; j++) {
          let budget = CONSUME_PER_TICK;
          for (let i = j; i < p; i += g.consumers) {
            const take = Math.min(budget, nextHeads[i] - committed[i]);
            committed[i] += take;
            budget -= take;
            if (budget <= 0) break;
          }
        }
        return { ...g, committed };
      });
      cursor.current += r;
      setHeads(nextHeads);
      setGroups(nextGroups);
    }, 650);
    return () => window.clearInterval(id);
  }, [running]);

  const pushEvent = (t: string) => setEvents((e) => [t, ...e].slice(0, 5));
  const rebalance = (name: string, consumers: number, nP: number) =>
    `${name}: rebalance → ${Array.from({ length: nP }, (_, i) => `P${i}→c${ownedBy(i, consumers) + 1}`).join("  ")}`;

  const addPartition = () => {
    if (heads.length >= MAX_PARTITIONS) return;
    const p = heads.length;
    setHeads([...heads, 0]);
    setGroups(groups.map((g) => ({ ...g, committed: [...g.committed, 0] })));
    pushEvent(`+ Partition P${p} added (empty, offset 0). Keyed producers now route hash(key) % ${p + 1}, so a key can move to a new partition — per-key order holds only from here forward.`);
  };
  const removePartition = () => {
    if (heads.length <= 1) return;
    const np = heads.length - 1;
    setHeads(Array(np).fill(0));
    setGroups(groups.map((g) => ({ ...g, committed: Array(np).fill(0) })));
    cursor.current = 0;
    pushEvent(`⚠ Kafka can't shrink a live topic. Recreated with ${np} partitions — every offset reset to 0 and key routing changed.`);
  };

  const addGroup = () => {
    if (groups.length >= MAX_GROUPS) return;
    const spec = PALETTE[groups.length];
    setGroups([...groups, { name: spec.key, consumers: 1, committed: Array(heads.length).fill(0) }]);
    pushEvent(`+ Consumer group "${spec.key}" subscribed — it reads the whole topic from offset 0, with its OWN offsets, independent of other groups.`);
  };
  const removeGroup = () => {
    if (groups.length <= 1) return;
    const gone = groups[groups.length - 1].name;
    setGroups(groups.slice(0, -1));
    pushEvent(`− Consumer group "${gone}" left.`);
  };

  const addConsumer = (gi: number) => {
    const g = groups[gi];
    if (g.consumers >= heads.length + 1) return; // allow one extra to show "idle"
    const consumers = g.consumers + 1;
    setGroups(groups.map((x, i) => (i === gi ? { ...x, consumers } : x)));
    pushEvent(consumers > heads.length ? `${g.name}: consumer c${consumers} joined — but there are only ${heads.length} partitions, so it sits IDLE.` : rebalance(g.name, consumers, heads.length));
  };
  const removeConsumer = (gi: number) => {
    const g = groups[gi];
    if (g.consumers <= 1) return;
    const consumers = g.consumers - 1;
    setGroups(groups.map((x, i) => (i === gi ? { ...x, consumers } : x)));
    pushEvent(`${g.name}: consumer c${g.consumers} left. ${rebalance(g.name, consumers, heads.length)}`);
  };

  const reset = () => {
    setHeads([0, 0, 0]);
    setGroups([{ name: "analytics", consumers: 2, committed: [0, 0, 0] }]);
    setRate(6);
    cursor.current = 0;
    setEvents([]);
  };

  const maxHead = Math.max(1, ...heads);
  const groupSpec = (name: string) => PALETTE.find((p) => p.key === name) ?? PALETTE[0];

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} data-tour="kafka-play" className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          {running ? "❚❚ Pause" : "▶ Play"}
        </button>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-700" data-tour="kafka-partitions">
          <button type="button" onClick={addPartition} disabled={heads.length >= MAX_PARTITIONS} className="bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">+ Partition</button>
          <button type="button" onClick={removePartition} disabled={heads.length <= 1} className="border-l border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">− Partition</button>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-700" data-tour="kafka-groups">
          <button type="button" onClick={addGroup} disabled={groups.length >= MAX_GROUPS} className="bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">+ Group</button>
          <button type="button" onClick={removeGroup} disabled={groups.length <= 1} className="border-l border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">− Group</button>
        </div>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
        <label className="ml-1 flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-400">Produce</span>
          <input type="range" min={0} max={20} step={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-24 accent-amber-500" />
          <span className="w-10 tabular-nums text-slate-400">{rate}/t</span>
        </label>
      </div>

      {/* topic: partitions × offsets, with each group's committed offset */}
      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        Topic · {heads.length} partition{heads.length === 1 ? "" : "s"} — each row is an append-only log, offset grows left→right
      </div>
      <div className="overflow-x-auto" data-tour="kafka-topic">
        <table className="w-full min-w-[520px] border-separate border-spacing-y-1">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-slate-500">
              <th className="w-8 text-left font-medium"> </th>
              <th className="text-left font-medium">log (amber = produced)</th>
              <th className="w-16 text-right font-medium">head</th>
              {groups.map((g) => (
                <th key={g.name} className="w-24 text-right font-medium">
                  <span className={groupSpec(g.name).text}>{g.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heads.map((head, i) => (
              <tr key={i}>
                <td className="font-mono text-xs text-slate-400">P{i}</td>
                <td className="pr-2">
                  <div className="relative h-6 w-full overflow-visible rounded bg-slate-900 ring-1 ring-slate-800">
                    <div className="absolute inset-y-0 left-0 rounded bg-amber-500/30" style={{ width: `${(head / maxHead) * 100}%` }} />
                    {groups.map((g, gi) => {
                      const c = g.committed[i];
                      const left = (c / maxHead) * 100;
                      const spec = groupSpec(g.name);
                      return (
                        <div key={g.name} className="absolute inset-y-0" style={{ left: `calc(${left}% - 1px)` }} title={`${g.name}: offset ${c}`}>
                          <div className="h-full w-0.5" style={{ background: spec.color }} />
                          <div className="absolute -top-0.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ left: "1px", background: spec.color, opacity: gi === 0 ? 1 : 0.9 }} />
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="text-right font-mono text-[11px] tabular-nums text-amber-300">{head}</td>
                {groups.map((g) => {
                  const c = g.committed[i];
                  const lag = head - c;
                  const spec = groupSpec(g.name);
                  return (
                    <td key={g.name} className={`text-right font-mono text-[11px] tabular-nums ${spec.text}`}>
                      {c}
                      <span className={lag > 0 ? "text-slate-500" : "text-slate-700"}> /{lag}⤴</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-4 mt-1 text-[10px] text-slate-500">
        each group column shows <span className="text-slate-400">committed&nbsp;offset</span> / <span className="text-slate-400">lag⤴</span> (records still to read = head − committed). The coloured tick on each log is that group&rsquo;s read position.
      </p>

      {/* consumer groups & their consumers */}
      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-500">Consumer groups — each reads the whole topic independently</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-tour="kafka-consumers">
        {groups.map((g, gi) => {
          const spec = groupSpec(g.name);
          const totalLag = g.committed.reduce((s, c, i) => s + (heads[i] - c), 0);
          return (
            <div key={g.name} className={`rounded-lg border ${spec.ring} ${spec.bg} p-2.5`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-sm font-semibold ${spec.text}`}>{g.name}</span>
                <span className="text-[10px] text-slate-400">lag <span className={`font-mono tabular-nums ${totalLag > 30 ? "text-amber-300" : "text-slate-300"}`}>{totalLag}</span></span>
              </div>
              <div className="space-y-1">
                {Array.from({ length: g.consumers }, (_, j) => {
                  const owned = partitionsOf(j, g.consumers, heads.length);
                  return (
                    <div key={j} className="flex items-center justify-between rounded bg-slate-900/60 px-2 py-1 text-[11px]">
                      <span className="font-mono text-slate-300">c{j + 1}</span>
                      <span className={owned.length ? "font-mono text-slate-400" : "italic text-amber-400/80"}>
                        {owned.length ? `owns ${owned.map((p) => `P${p}`).join(", ")}` : "idle — no partition"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-1">
                <button type="button" onClick={() => addConsumer(gi)} disabled={g.consumers >= heads.length + 1} className="flex-1 rounded border border-slate-700 bg-slate-900 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">+ consumer</button>
                <button type="button" onClick={() => removeConsumer(gi)} disabled={g.consumers <= 1} className="flex-1 rounded border border-slate-700 bg-slate-900 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40">− consumer</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* events */}
      {events.length ? (
        <div className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-[11px] leading-snug text-sky-300">
          {events.map((e, i) => (
            <p key={i} className={i === 0 ? "" : "text-sky-300/50"}>{e}</p>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Try it: <strong className="text-slate-400">+ Consumer</strong> in a group up to the partition count to cut its lag; one more and it sits idle (partitions cap parallelism). <strong className="text-slate-400">+ Group</strong> to see a second group read the same records at its own offset. <strong className="text-slate-400">+ Partition</strong> to add capacity; <strong className="text-slate-400">− Partition</strong> to see why Kafka won&rsquo;t shrink a topic in place.
      </p>
      <GuidedTour tourId="kafka-internals" steps={TOUR} autoStart={false} />
    </div>
  );
}
