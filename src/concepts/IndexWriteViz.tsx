"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR: TourStep[] = [
  { title: "What a write does to the index", body: "A row insert isn't just an append — the B⁺-tree index has to stay sorted and balanced. Watch it happen key by key." },
  { target: "[data-tour='iw-input']", title: "Insert a key", body: "Type the indexed value of a new row and Insert. The tree descends to the right leaf and drops it in, in sorted order." },
  { target: "[data-tour='iw-auto']", title: "Watch it grow", body: "Auto-insert a whole sequence and watch leaves fill, split, and push a separator up — that's how the tree stays shallow." },
  { target: "[data-tour='iw-tree']", title: "The B⁺-tree", body: "Blue = the path the write descended. Amber pulse = keys just inserted or promoted. Leaves hold every real entry; internal nodes hold only routing keys." },
  { target: "[data-tour='iw-stats']", title: "Height & splits", body: "Height barely grows (that's log(n)); the split counter shows how often a full node had to divide. Every split is extra write work." },
];

const MAXKEYS = 3; // order-4 B⁺-tree: a node holds at most 3 keys before it splits

interface BNode { leaf: boolean; keys: number[]; children: BNode[] }
const leafNode = (keys: number[]): BNode => ({ leaf: true, keys, children: [] });

interface Ins { node: BNode; promoted?: { up: number; right: BNode } }
interface Ctx { msgs: string[]; flashes: number[]; splits: number }

function insertInto(node: BNode, key: number, ctx: Ctx): Ins {
  if (node.leaf) {
    if (node.keys.includes(key)) { ctx.msgs.push(`Key ${key} already indexed — no change.`); return { node }; }
    const keys = [...node.keys, key].sort((a, b) => a - b);
    if (keys.length <= MAXKEYS) {
      ctx.flashes.push(key);
      ctx.msgs.push(`Descended to a leaf and inserted ${key} in sorted order — leaf still has room (${keys.length}/${MAXKEYS}).`);
      return { node: leafNode(keys) };
    }
    const mid = Math.floor(keys.length / 2);
    const left = keys.slice(0, mid), right = keys.slice(mid);
    const up = right[0];
    ctx.splits += 1;
    ctx.flashes.push(key, up);
    ctx.msgs.push(`Leaf overflowed (${keys.length} > ${MAXKEYS}) → split into [${left.join(", ")}] and [${right.join(", ")}]; copied ${up} up to the parent.`);
    return { node: leafNode(left), promoted: { up, right: leafNode(right) } };
  }
  let i = 0;
  while (i < node.keys.length && key >= node.keys[i]) i++;
  const res = insertInto(node.children[i], key, ctx);
  const children = [...node.children];
  children[i] = res.node;
  const keys = [...node.keys];
  if (res.promoted) { keys.splice(i, 0, res.promoted.up); children.splice(i + 1, 0, res.promoted.right); }
  if (keys.length <= MAXKEYS) return { node: { leaf: false, keys, children } };
  const mid = Math.floor(keys.length / 2);
  const up = keys[mid];
  ctx.splits += 1;
  ctx.flashes.push(up);
  ctx.msgs.push(`Parent node overflowed → split; pushed separator ${up} one level up.`);
  return {
    node: { leaf: false, keys: keys.slice(0, mid), children: children.slice(0, mid + 1) },
    promoted: { up, right: { leaf: false, keys: keys.slice(mid + 1), children: children.slice(mid + 1) } },
  };
}

function insertKey(root: BNode, key: number, ctx: Ctx): BNode {
  const res = insertInto(root, key, ctx);
  if (res.promoted) {
    ctx.msgs.push(`Root split → the tree grew one level taller. New root routes on ${res.promoted.up}.`);
    return { leaf: false, keys: [res.promoted.up], children: [res.node, res.promoted.right] };
  }
  return res.node;
}

function descentPath(root: BNode, key: number): BNode[] {
  const path = [root];
  let n = root;
  while (!n.leaf) {
    let i = 0;
    while (i < n.keys.length && key >= n.keys[i]) i++;
    n = n.children[i];
    path.push(n);
  }
  return path;
}

const height = (n: BNode): number => (n.leaf ? 1 : 1 + height(n.children[0]));
const countLeafKeys = (n: BNode): number => (n.leaf ? n.keys.length : n.children.reduce((s, c) => s + countLeafKeys(c), 0));

const T = {
  postgres: { name: "PostgreSQL", accent: "sky", store: "heap", ptr: "ctid", ddl: "INSERT INTO users (…) VALUES (…);  -- index maintained automatically" },
  mongodb: { name: "MongoDB", accent: "emerald", store: "collection", ptr: "RecordId", ddl: "db.users.insertOne({ … })   // index maintained automatically" },
} as const;

export type DB = "postgres" | "mongodb";

export function IndexWriteViz({ db }: { db: DB }) {
  const t = T[db];
  const [tree, setTree] = useState<BNode>(() => leafNode([20, 40]));
  const [value, setValue] = useState("30");
  const [path, setPath] = useState<Set<BNode>>(() => new Set());
  const [flash, setFlash] = useState<Set<number>>(() => new Set());
  const [msgs, setMsgs] = useState<string[]>([]);
  const [splits, setSplits] = useState(0);
  const [busy, setBusy] = useState(false);

  const treeRef = useRef(tree);
  const timers = useRef<number[]>([]);
  useEffect(() => { treeRef.current = tree; }, [tree]);
  const clearTimers = () => { timers.current.forEach((x) => window.clearTimeout(x)); timers.current = []; };
  const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => clearTimers(), []);

  // One animated insert: highlight the descent, then commit + pulse the changes.
  const animateInsert = (key: number, base = 0) => {
    at(base, () => { setPath(new Set(descentPath(treeRef.current, key))); setFlash(new Set()); });
    at(base + 520, () => {
      const ctx: Ctx = { msgs: [], flashes: [], splits: 0 };
      const next = insertKey(treeRef.current, key, ctx);
      treeRef.current = next;
      setTree(next);
      setPath(new Set());
      setFlash(new Set(ctx.flashes));
      setMsgs(ctx.msgs);
      setSplits((s) => s + ctx.splits);
    });
    at(base + 1500, () => setFlash(new Set()));
  };

  const insertOne = () => {
    const key = Number(value);
    if (!Number.isFinite(key) || busy) return;
    clearTimers();
    setBusy(true);
    animateInsert(key);
    at(1600, () => setBusy(false));
    setValue(String(((key + 5) % 99) + 1));
  };

  const autoInsert = () => {
    if (busy) return;
    clearTimers();
    setBusy(true);
    const seq = [10, 50, 5, 35, 25, 45, 60, 15, 30, 55, 1, 42];
    seq.forEach((k, i) => animateInsert(k, i * 1650));
    at(seq.length * 1650, () => setBusy(false));
  };

  const reset = () => {
    clearTimers();
    setBusy(false);
    const init = leafNode([20, 40]);
    treeRef.current = init;
    setTree(init); setPath(new Set()); setFlash(new Set()); setMsgs([]); setSplits(0); setValue("30");
  };

  const accentText = t.accent === "sky" ? "text-sky-300" : "text-emerald-300";
  const accentBtn = t.accent === "sky" ? "bg-sky-500 hover:bg-sky-400" : "bg-emerald-500 hover:bg-emerald-400";

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="mb-3 text-[13px] leading-snug text-slate-400">
        A write (<code>INSERT</code>) has to keep the index sorted <em>and</em> balanced. The value descends the B⁺-tree
        to the correct <strong>leaf</strong>; if that leaf is full it <strong>splits</strong> and pushes a separator up —
        occasionally growing the tree a level. Both {t.name === "PostgreSQL" ? "Postgres" : "Mongo"} and the other engine
        use a B⁺-tree, so the mechanics below are identical; only the row pointer differs
        (<code className={accentText}>{t.ptr}</code>).
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2" data-tour="iw-input">
        <label className="flex items-center gap-1.5 text-sm text-slate-300">
          <span className="text-slate-500">indexed value</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") insertOne(); }}
            className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-slate-200"
          />
        </label>
        <button type="button" onClick={insertOne} disabled={busy} className={`rounded-md px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-40 ${accentBtn}`}>Insert row →</button>
        <button type="button" onClick={autoInsert} disabled={busy} data-tour="iw-auto" className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40">Auto-insert a sequence</button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/30 p-4" data-tour="iw-tree">
        <div className="flex min-w-fit justify-center">
          <TreeNode node={tree} path={path} flash={flash} accent={t.accent} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2" data-tour="iw-stats">
        <Stat label="tree height" value={String(height(tree))} />
        <Stat label="keys indexed" value={String(countLeafKeys(tree))} />
        <Stat label="node splits" value={String(splits)} tone={splits > 0 ? "warn" : "neutral"} />
      </div>

      <div className="mt-2 min-h-[34px] space-y-0.5 text-[12px] leading-snug">
        {msgs.length ? msgs.map((m, i) => (
          <p key={i} className={i === msgs.length - 1 ? accentText : "text-slate-500"}>{m}</p>
        )) : (
          <p className="text-slate-600">Insert a value, or auto-insert a sequence, and watch leaves fill and split. Every split is extra work a write pays to keep reads at log(n).</p>
        )}
      </div>
      <GuidedTour tourId={`index-write-${db}`} steps={TOUR} autoStart={false} />
    </div>
  );
}

function TreeNode({ node, path, flash, accent }: { node: BNode; path: Set<BNode>; flash: Set<number>; accent: "sky" | "emerald" }) {
  const onPath = path.has(node);
  const ring = onPath
    ? (accent === "sky" ? "border-sky-400 bg-sky-500/15" : "border-emerald-400 bg-emerald-500/15")
    : node.leaf ? "border-slate-700 bg-slate-900" : "border-slate-600 bg-slate-800/60";
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-stretch overflow-hidden rounded-md border ${ring}`}>
        {node.keys.map((k, i) => {
          const hot = flash.has(k);
          return (
            <span
              key={`${k}-${i}`}
              className={`border-l border-slate-700/60 px-2.5 py-1 font-mono text-[13px] tabular-nums first:border-l-0 transition-colors ${hot ? "bg-amber-400 font-bold text-slate-950" : node.leaf ? "text-slate-200" : "text-slate-400"}`}
            >
              {k}
            </span>
          );
        })}
      </div>
      {!node.leaf ? (
        <>
          <div className="h-3 w-px bg-slate-600" />
          <div className="flex items-start gap-3">
            {node.children.map((c, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="mb-0 h-3 w-px bg-slate-600" />
                <TreeNode node={c} path={path} flash={flash} accent={accent} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <span className="mt-1 text-[9px] uppercase tracking-wide text-slate-600">leaf</span>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "warn" | "neutral" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${tone === "warn" ? "text-amber-300" : "text-slate-200"}`}>{value}</div>
    </div>
  );
}

export function PostgresIndexWriteViz() { return <IndexWriteViz db="postgres" />; }
export function MongoIndexWriteViz() { return <IndexWriteViz db="mongodb" />; }
