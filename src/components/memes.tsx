"use client";

import { useState } from "react";

/* ================================================================== *
 * A little personality. Tasteful, accurate systems-design humor —
 * the jokes engineers actually tell. A shuffling card for the home
 * page, and topic-keyed one-liners to sprinkle on concept/tech pages.
 * ================================================================== */

export interface Meme { punch: string; by?: string }

/** Rotating dev-humor deck for the home page. */
const DECK: Meme[] = [
  { punch: "The two hardest problems in distributed systems: 2. Exactly-once delivery. 1. Guaranteed order of messages. 2. Exactly-once delivery." },
  { punch: "There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors." },
  { punch: "We replaced our monolith with microservices so every outage could feel more like a murder mystery." },
  { punch: "“Just add a cache.” — the four words that precede every cache-invalidation incident." },
  { punch: "CAP theorem: Consistency, Availability, Partition-tolerance. Pick two. (The network already picked P for you.)" },
  { punch: "It's not a bug, it's an undocumented feature. Ship it." },
  { punch: "Getting five servers to agree is hard. Getting five engineers to agree is impossible." },
  { punch: "There is no cloud. It's just someone else's computer — with a very good on-call rotation." },
];

/** Topic-keyed one-liners for specific pages. */
export const TOPIC_MEMES: Record<string, Meme> = {
  "delivery-semantics": { punch: "The two hardest problems in distributed systems: 2. Exactly-once delivery. 1. Guaranteed order. 2. Exactly-once delivery." },
  caching: { punch: "There are only two hard things in CS: cache invalidation, naming things, and off-by-one errors." },
  cap: { punch: "CAP theorem: pick two. The network already picked P for you — so you're really picking one." },
  "monolith-vs-microservices": { punch: "A modular monolith is a microservices architecture that respects your on-call rotation." },
  indexing: { punch: "Postgres uses B-trees. Mongo uses B-trees. Everyone on the internet uses air quotes.", by: "the myth this page debunks" },
  "rate-limiting": { punch: "429 Too Many Requests — the politest way a server has ever said “please stop.”" },
  "retries-backoff": { punch: "A retry storm is just enthusiasm the service never asked for." },
  raft: { punch: "Consensus: because the only thing harder than distributed state is agreeing on it." },
  sharding: { punch: "Sharding: the art of turning one database problem into N database problems." },
  acid: { punch: "ROLLBACK — the Ctrl+Z of databases, and the reason you still have a job." },
  replication: { punch: "Eventually consistent: like your team's understanding of “eventually.”" },
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <figure className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/70 to-slate-900/30 p-4">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-600">{"// certified systems-design humor"}</div>
      {children}
    </figure>
  );
}

/** A single topic meme, for embedding on a page. */
export function TopicMeme({ topic }: { topic: string }) {
  const m = TOPIC_MEMES[topic];
  if (!m) return null;
  return (
    <Frame>
      <blockquote className="text-[15px] leading-snug text-slate-200">{m.punch}</blockquote>
      {m.by ? <figcaption className="mt-1.5 text-[11px] text-slate-500">— {m.by}</figcaption> : null}
    </Frame>
  );
}

/** Home-page shuffling deck. Click for the next one. */
export function MemeShuffle() {
  const [i, setI] = useState(0);
  const m = DECK[i % DECK.length];
  return (
    <Frame>
      <blockquote className="min-h-[44px] text-[15px] leading-snug text-slate-200">{m.punch}</blockquote>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-600">{(i % DECK.length) + 1} / {DECK.length}</span>
        <button type="button" onClick={() => setI((n) => n + 1)} className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[12px] font-medium text-slate-300 hover:text-white">Another one →</button>
      </div>
    </Frame>
  );
}
