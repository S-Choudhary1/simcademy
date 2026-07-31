# SysVerse — TODO

Backlog captured 2026-07-30. Ordered roughly by priority.

## Bugs
- [x] **Request / metric counts wrong in some flows.** ~~The request engine's request/completion count (and possibly throughput) is off in certain topologies.~~ **Fixed 2026-07-30.** Root cause: **source (producer) and queue (broker) nodes never incremented `completed`**, so async/Kafka/RabbitMQ flows showed those nodes as `0` served despite full traffic. Audited LB fan-out, cache hit/miss, async drain, and multi-hop chains — those already reconciled. Fix in `engine.ts`: `emit` now does `s.completed++` (source counts what it emits); queue `arrive` branch now does `s.completed++` on accept (broker counts what it publishes). Verified: engine audit + 9/9 tests + browser (Producer 194 / Broker 210 / Consumer 113, all reconcile; previously 0/0).

## Metrics
- [ ] **Save / export metrics.** Let the user save & download metrics — p99, TPS/throughput, latency percentiles, per-node stats, and the time-series history — as **CSV** (a "Download CSV" button in the Playground / StatusBar).

## Coverage expansion (in progress 2026-07-31) — user picked all 4 areas
Build order, each verified against official docs + browser, 0 console errors.
- [x] **Distributed systems** — `/concepts/sharding` (`ShardingViz`: range vs hash, hot shard, resharding movement %) and `/concepts/raft` (`RaftViz`: 5 servers, leader election on crash, majority commit amber→green, quorum loss). Wired into catalog + registry.
- [x] **Database internals — DONE 2026-07-31.** `/concepts/isolation-levels` (`IsolationViz`: level × anomaly interleaving + guarantee matrix; SQL-standard with PostgreSQL footnotes — no dirty reads ever, RR prevents phantoms, SSI) and `/concepts/lsm-vs-btree` (`LsmBtreeViz`: memtable→SSTable flush vs in-place leaf; read touches N stores vs 1 page). Verified: RC allows non-repeatable / Serializable prevents all; LSM read touched 3 stores vs B-tree 1 page. 0 errors.
- **Playground UX fixes (2026-07-31):** (1) pod-stack now visible — ghost layers were using the near-black card border (`#1e293b`), switched to `#64748b`/sky + 7px offset so replicas read as a clear stack. (2) Added a **Speed control** (½×/1×/2×, default ½×) — `store.speed` multiplies tick dt — so DOWN/narration events unfold slowly enough to read.
- [x] **Messaging & reliability — DONE 2026-07-31.** `/concepts/delivery-semantics` (`DeliverySemanticsViz`: mode × failure interleaving, effect-count — at-least+ack-lost=2 dup, exactly+ack-lost=1) and `/concepts/retries-backoff` (`RetryBackoffViz`: 5 clients, retry timeline + load histogram; peaks immediate 15 → fixed/expo 5 → jitter 3; initial failure excluded from load). Verified, 0 errors.
- [x] **New technology (Cassandra) — DONE 2026-07-31.** `/technologies/cassandra` with `CassandraQuorumViz` (tunable consistency: R + W > N crossover, write set vs read set overlap → strong/eventual; verified 3+3>5 strong, 1+1≤5 eventual). Added to TECHNOLOGIES catalog; links to consistent-hashing, sharding, LSM-vs-B-tree, CAP.

**→ Coverage expansion COMPLETE (all 4 user-selected areas): distributed systems (sharding, raft), database internals (isolation/MVCC, LSM-vs-B-tree), messaging & reliability (delivery semantics, retries/backoff), new tech (Cassandra).**

## Kafka internals (DONE 2026-07-31)
- [x] **`KafkaInternalsViz` rebuilt** (on `/technologies/kafka`). Now covers: append-only partition **logs with offsets** (head + committed per group); **add / remove partitions** (+Partition adds an empty log; −Partition shows the honest "Kafka can't shrink a live topic → recreate resets offsets" warning); **multiple independent consumer groups** (each its own offset column, reads whole topic from 0); **per-group consumers** with round-robin ownership, **rebalance** events on join/leave, and **idle consumers** when count exceeds partitions (parallelism capped by partitions). Verified in browser, 0 console errors.

## Concepts & Database
- [ ] Keep expanding concept coverage and database internals.
- [x] **Database Index viz → real tree structure.** **Superseded 2026-07-30 (v2).** The abstract B-tree/B+ tree viz (`DatabaseIndexViz`) was **removed** per user feedback ("still not satisfied with b tree") and replaced by **two concrete, per-database concepts** using real data:
  - `/concepts/postgresql-indexing` (viz `PostgresIndexViz`) — real 10-row **heap** table + **B-tree index on email** with `ctid` pointers; search **email (indexed) → Index Scan (1 row examined)** vs **city (no index) → Seq Scan (10 examined)**. Never searches `id`.
  - `/concepts/mongodb-indexing` (viz `MongoIndexViz`) — **10 real JSON documents** + B-tree with `RecordId` pointers; **email → IXSCAN→FETCH (1 doc)** vs **city → COLLSCAN (10 docs)**.
  - Shared engine `src/concepts/IndexExplorer.tsx` (`IndexExplorer({db})`); animates index descent → pointer → row fetch, or sequential scan. Verified in browser, 0 errors.

## Query execution flow (DONE 2026-07-30)
Built as a new concept: `/concepts/query-planning` ("Query Planning & Joins"), viz `QueryPlanningViz`. Shown **per database (PostgreSQL vs MongoDB toggle)** across three tabs.
- [x] **Index types** — pick a query pattern (equality/range/sort/prefix/array/text/geo) → highlights which index serves it. Postgres: B-tree, Hash, GIN, GiST, BRIN. Mongo: single-field, compound, multikey, text, 2dsphere, hashed (with the ESR note).
- [x] **Query planner** — **rebuilt concrete 2026-07-30 (v2)** per user feedback ("query planner I don't like at all"). Was abstract table-size × selectivity buttons; now a real `WHERE age >= X` range over the same 10 real rows, matched rows highlighted live, and the plan **flips at the cost crossover**: PG Index Scan (age≥35, 4 rows) → Seq Scan (age≥30, 6 rows); Mongo IXSCAN → COLLSCAN. Illustrative page-read cost model. Verified in browser, 0 errors.
- [x] **Joins** — animated step-by-step over users×orders. Postgres: nested-loop / hash (build+probe) / merge (two-pointer). Mongo: `$lookup` as indexed nested-loop producing embedded `orders:[...]`, with the embed-to-avoid-the-join note.
- [x] End-to-end parse→plan→execute framing on the page.
Registered in catalog CONCEPTS + registry CONCEPT_SIMS (shows on /concepts index and in the Playground hub). typecheck/lint/build clean, 0 console errors.

### Future extensions (not yet built)
- [ ] Bitmap Index Scan / Bitmap Heap Scan for Postgres (multiple indexes combined).
- [ ] Covering / index-only scans (Postgres `INCLUDE`, Mongo covered queries) as a planner outcome.
- [ ] Wildcard indexes (Mongo) and partial/expression indexes (both).
- [ ] Animate the parse→plan→execute pipeline itself as one flow diagram.

## Learning UX — product tour / guided walkthrough (idea 2026-07-30)
Turn the UI itself into the lesson. The goal: a first-time visitor understands every control AND what the simulation is doing, without reading docs first. HIGH learning value.
- [x] **Guided product tour — DONE (pilot + full rollout) 2026-07-31.** Reusable `src/components/GuidedTour.tsx` (no dependency): spotlight cutout + tooltip, Next/Back/Skip, progress dots, keyboard (←/→/Esc), remembers "seen" (localStorage `tour:<id>`), re-run via floating 🎓 button. **Playground** tour auto-starts once (10 steps). **All ~20 concept/tech sims instrumented** with opt-in tours (autoStart=false, 🎓 button): Playground, Raft, Kafka internals, Sharding, PostgreSQL/MongoDB indexing, Query planning, Circuit breaker, Rate limiting, Consistent hashing, Replication, Connection pool, Saga, Two-phase commit, Locking, Outbox, Idempotency, Event sourcing, CQRS, CAP, ACID, BASE. Full gate clean; browser sweep of 17 pages all open + step correctly, 0 console errors. (Concept tours are opt-in to avoid auto-firing on every page; flip autoStart=true if auto-start on concept pages is wanted.)
- [ ] **Always-on help mode** — a `?` toggle that shows a one-line explainer tooltip on every button (hover / focus), so users can recall a single control without replaying the whole tour.
- [x] **"What's happening" live narration — DONE 2026-07-31.** Collapsible panel at the bottom of the Playground that reads the engine snapshot each tick and explains behaviour in plain English, mapping every signal → {reason, fix}. `src/sim/insights.ts` (pure `analyze(snapshot)` → Insight[] with severity/title/reason/fix) + `src/sim/ui/LiveNarration.tsx` (collapsible, top-insight summary when collapsed, severity badges, Why/Fix cards). Signals: high error rate, high p99 tail latency, node DOWN / partitioned / slow, bottleneck, saturated (>90%), queue lag (backlog), dropped/limited requests, and a healthy summary. Fixes tailored by component behaviour (service→replicas/cache, datastore→read replicas/shard, queue→consumers/partitions, limiter→raise limit, router→scale out). Added a tour step ('tour-explain'). Verified in browser: healthy → saturated (Why+Fix) → DOWN (Why+Fix), 0 console errors.
- [ ] **Per-surface tours** — the Playground gets the full tour; each bespoke concept viz (PostgreSQL/MongoDB indexing, query planner, joins, saga, circuit breaker, etc.) gets a short 3–5 step tour of its own controls + what the animation shows.
- [ ] **Implementation notes** — use a standard lightweight library (recommend **driver.js**, ~5kb, no deps, spotlight + tooltips) rather than hand-rolling. Define steps as DATA (element selector/ref + title + body) per surface in one registry. Must be skippable, resumable, mobile-friendly, keyboard-accessible, and never block interaction. Consider a global "Tour / Help" entry in the SiteHeader.

## Comparisons (expanded 2026-07-31)
- [x] **Medium-style article layout** — `src/components/article.tsx` (Article/Kicker/Title/Dek/Meta/Versus/Lede/H2/P/Callout/PullQuote/CompareTable/ChooseWhen/Related/A): ~720px measure, generous leading, quiet links, hero cards, TL;DR callout, N-column compare table, "choose when" cards.
- [x] **3 new comparisons**: `/comparisons/sql-vs-nosql`, `/comparisons/rest-vs-grpc-vs-graphql` (3-way), `/comparisons/monolith-vs-microservices`. Registered in catalog. Verified 200 + table + 5 sections each, 0 errors.
- [x] **Retrofitted** kafka-vs-rabbitmq & postgresql-vs-mongodb to the new article layout — added a wide `Figure` (breakout) to host the live `ComparisonSim` with a caption; all 5 comparisons now share the Medium-style layout. Verified sims still render. 0 errors.

## Architectures (expanded 2026-07-31)
- [x] **2 new case studies**: `/architectures/news-feed` (fan-out on write → feed cache; celebrity/hybrid problem) and `/architectures/typeahead` (debounce + prefix cache → trie index). Added to ARCHITECTURES (auto-lists on index + Playground picker), each with preset replicas/pod stacks. 6 architectures total. Verified 200 + sim + pods, 0 errors.

## Rate limiter rebuild (2026-07-31)
- [x] `RateLimitViz` rebuilt (v2 → v3) per user requests: (1) **shared deterministic varying traffic** — one seeded value-noise stream feeds all algos (fair & reproducible); (2) **real animated buckets** — token fills/drains tokens, leaky fills like water & leaks, windows render as gauges; (3) **per-algorithm real params** — each algo has its OWN knobs via +/− steppers (token: refill+capacity; leaky: leak rate+queue size; windows: limit) — no longer shared/inaccurate; (4) **5th algorithm** — Sliding Window (log), the exact O(N) counterpart to the O(1) counter approximation; (5) **"how to implement"** — a </> toggle per card reveals accurate pseudocode. Verified: 5 cards, distinct leak-rate vs refill params, code toggles, divergence on identical traffic (53/53/47/42/40% — log strictest), 0 errors.

## Personality / memes (2026-07-31)
- [x] `src/components/memes.tsx` — `MemeShuffle` (home-page rotating deck, click for next) + `TopicMeme({topic})` (topic-keyed one-liners) + curated, accurate systems-design jokes. Home page has the shuffle after the hero; topic memes on delivery-semantics (exactly-once), cap (pick two), postgresql-indexing (B-tree myth), rate-limiting (429), monolith-vs-microservices. Verified render + shuffle, 0 errors. Easy to extend TOPIC_MEMES + drop `<TopicMeme>` on more pages.

## Rebrand → Simcademy + production-ready (2026-07-31)
- [x] **Renamed SysVerse → Simcademy** everywhere: layout metadata (title "Simcademy — Learn System Design by Doing", template, OG, keywords, metadataBase https://simcademy.app), header wordmark, article byline, package.json name, internal drag-key (application/simcademy-component). 0 stray refs.
- [x] **Logo + favicon**: `src/components/Logo.tsx` (request-flow graph mark + wordmark) in header/footer; `src/app/icon.svg` favicon (served text/svg, auto-linked).
- [x] **Removed Next.js defaults** (public/next.svg, vercel.svg, file/globe/window.svg).
- [x] **Production pages + footer**: `/about`, `/contact`, `/terms`, `/privacy` (real copy) + `SiteFooter` (Learn/Product/Legal columns, © 2026) on every page.
- [x] **SEO/production essentials**: `app/robots.ts`, catalog-driven `app/sitemap.ts` (all 44 routes), and `app/llms.txt/route.ts` (GEO — LLM-friendly site map, same catalog source). All 200, gates clean.

## Deploy (NEXT — ready)
- [ ] App is renamed + production-ready. Blocked on user's 2 answers: (1) repo folder — keep in sysverse/ (optionally rename folder to simcademy/) or move to parent; (2) commit identity — currently WORK (suresh.choudhary@vegapay.tech); user wants personal GitHub → set personal name+email on this repo before first commit. Then: commit → user adds personal remote & pushes → deploy (Vercel recommended for Next.js app w/ client sims).

## Other ideas (from earlier sessions)
- [x] **Pre-set replicas in architecture blueprints — DONE 2026-07-31.** `src/sim/architectures.ts`: Netflix (gateway/svcA/svcB ×3, cache ×2), URL Shortener (LB ×2, apps ×3, Postgres ×2), WhatsApp (gateway ×2, chat ×4, delivery workers ×2), Payment Gateway (gateway ×2, pay ×2). Each renders as a stacked-pods node (SimNode stack visual + "N pods" badge) and drives engine capacity (servers×replicas). Verified on /architectures/netflix. Also done: SimNode now renders replicas as a visible stack (up to 3 layers) + "N pods" badge (was just a ×N badge). Architectures are also loadable from the Playground blueprint picker (BLUEPRINT_CATALOG "Architectures" group).
- [x] **Auto-scale toggle — DONE 2026-07-31.** `src/sim/autoscale.ts` (HPA-style controller: scale up >85% util, down <30%, MIN 1 / MAX 8 pods, 0.8s eval, 2s per-node cooldown, hysteresis; skips failed/slow nodes; deterministic on sim time). Wired into store `tick` (gated on `autoScale`), toggle in StatusBar (⚖ Auto-scale), memory reset on load/reset, tour step added. Verified: scales up 1→2 pods under load, back to 1 when idle; 0 console errors.
- [ ] More technologies (Cassandra, Elasticsearch, gRPC) and concepts (Sharding standalone, Backpressure).
- [ ] Infra: Supabase for saved/shared playgrounds + accounts, then deploy to Vercel.
