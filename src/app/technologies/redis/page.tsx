import Link from "next/link";
import type { Metadata } from "next";
import { TechSimulator } from "@/sim/ui/TechSimulator";
import { RedisEvictionViz } from "@/concepts/RedisEvictionViz";

export const metadata: Metadata = {
  title: "Redis — Interactive Simulation",
  description:
    "Explore how Redis works as a cache: hit ratio, LRU eviction, cache-aside reads, and effective latency. Interactive, browser-based simulation — change the traffic skew, flush the cache, and watch the database get stampeded.",
  keywords: [
    "Redis",
    "cache",
    "cache-aside",
    "LRU eviction",
    "cache hit ratio",
    "in-memory store",
    "cache stampede",
  ],
  alternates: { canonical: "/technologies/redis" },
  openGraph: {
    title: "Redis — Interactive Simulation",
    description: "Change the traffic skew, flush the cache, and watch effective latency respond.",
    type: "article",
  },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-800 py-8 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function RedisPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Technologies</span> /{" "}
        <span className="text-slate-300">Redis</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">
            Technology
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            Intermediate
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Redis</h1>
        <p className="mt-2 text-slate-400">
          An in-memory data store most often used as a fast cache in front of a slower database.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          Redis keeps data in memory, so reads and writes take microseconds. Its most common job is
          a <strong>cache</strong>: a small, fast copy of the hottest data that sits in front of a
          larger, slower database. When the cache has what you asked for, you skip the database
          entirely.
        </p>
      </Section>

      <Section id="problem" title="2. Why it exists">
        <p>
          Databases are durable but comparatively slow, and they buckle under high read volume.
          Most real workloads are heavily skewed — a small set of keys receives the majority of
          requests. A cache exploits that skew: hold the hot keys in memory and the database only
          sees the misses.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          Press <strong>Play</strong>. Clients issue reads; a green dot is a cache <em>hit</em>, an
          amber dot falls through to the <strong>database</strong>. Raise <strong>Traffic skew</strong>{" "}
          and the hit ratio climbs; shrink <strong>Cache capacity</strong> and evictions rise. Then
          hit <strong>Flush cache</strong> and watch DB load spike as every request stampedes the
          cold cache at once.
        </p>
        <TechSimulator tech="redis" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: eviction policies</h3>
        <p>
          When the cache hits its memory limit, a new key evicts an existing one. Fill the cache, then GET a fresh key
          and watch the victim chosen by <strong>LRU</strong> (least recently used), <strong>LFU</strong> (least
          frequently used), or <strong>random</strong>.
        </p>
        <RedisEvictionViz />
      </Section>

      <Section id="architecture" title="4. Architecture (Cache-Aside)">
        <p>
          The most common pattern is <strong>cache-aside</strong>: the application checks Redis
          first. On a hit it returns immediately. On a miss it reads the database, writes the value
          back into Redis, and returns it. Redis does not know about the database — the application
          orchestrates both.
        </p>
      </Section>

      <Section id="lifecycle" title="5. Request Lifecycle">
        <p>
          Read: <code>GET key</code> → hit returns in ~1ms; miss triggers a database query
          (~50ms in the simulation), a write-back into the cache, then the response. Because the
          value is now cached, the <em>next</em> request for that key is a hit — this is how a cold
          cache warms up.
        </p>
      </Section>

      <Section id="components" title="6. Internal Components">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>In-memory key space</strong> — a giant hash map of keys to values.
          </li>
          <li>
            <strong>Eviction policy</strong> — when memory is full, which key to drop.{" "}
            <code>allkeys-lru</code> (used here) drops the least-recently-used key.
          </li>
          <li>
            <strong>TTL / expiry</strong> — keys can be set to expire, bounding staleness.
          </li>
        </ul>
      </Section>

      <Section id="scaling" title="7. Scaling">
        <p>
          Scale reads with replicas; scale capacity with Redis Cluster, which shards the key space
          across nodes (typically via consistent hashing). In the simulation, a cache far smaller
          than the keyspace still achieves a high hit ratio — because traffic is skewed toward hot
          keys.
        </p>
      </Section>

      <Section id="failure" title="8. Failure Scenarios">
        <p>
          Click <strong>Fail cache node</strong>: every read now falls through to the database and
          DB load jumps to the full request rate. <strong>Flush cache</strong> shows the same danger
          transiently — a cold cache causes a <em>stampede</em>, which is why production systems use
          request coalescing and staggered TTLs to avoid mass simultaneous expiry.
        </p>
      </Section>

      <Section id="metrics" title="9. Metrics">
        <p>
          <strong>Hit ratio</strong> is the headline number; everything else follows from it.{" "}
          <strong>Effective latency</strong> is a weighted blend of the fast hit path and the slow
          miss path, so a small drop in hit ratio can cause a large latency increase.{" "}
          <strong>DB load</strong> equals the miss rate — the cache&rsquo;s entire job is to keep
          this number small.
        </p>
      </Section>

      <Section id="tradeoffs" title="10. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Speed vs. freshness — cached data can be stale until it expires or is invalidated.</li>
          <li>Memory is expensive — you cache the hot subset, not everything.</li>
          <li>Adds a consistency problem: cache and database can disagree (invalidation is hard).</li>
        </ul>
      </Section>

      <Section id="comparisons" title="11. Comparisons">
        <p>
          See <span className="text-slate-400">Redis vs Memcached</span> (coming soon): both are
          in-memory caches; Redis adds rich data structures, persistence, replication, and
          scripting, while Memcached is a leaner, multi-threaded, pure cache.
        </p>
      </Section>

      <Section id="usage" title="12. Real-world Usage">
        <p>
          Session stores, rate limiters, leaderboards, queues, and — most of all — read-through
          caching in front of relational and document databases. Ubiquitous across web-scale
          backends.
        </p>
      </Section>

      <Section id="related" title="13. Related Concepts">
        <p className="flex flex-wrap gap-2">
          {["Consistent Hashing", "Cache Invalidation", "LRU", "TTL", "Thundering Herd"].map((c) => (
            <span key={c} className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">
              {c}
            </span>
          ))}
        </p>
      </Section>

      <Section id="interview" title="14. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Why can a cache much smaller than the keyspace still have a high hit ratio?</li>
          <li>Walk through the cache-aside read and write paths.</li>
          <li>What is a cache stampede, and how do you prevent it?</li>
          <li>How does effective latency depend on hit ratio, and why is it non-linear in impact?</li>
        </ol>
      </Section>

      <Section id="usage" title="How to use it">
        <p>The canonical cache-aside read, plus an eviction policy so memory stays bounded:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`let value = await redis.get(key)
if (value === null) {                    // miss → load and backfill
  value = await db.load(key)
  await redis.set(key, value, "EX", 300) // TTL 5 min
}
return value

# redis.conf — cap memory and evict the least-recently-used keys
maxmemory 4gb
maxmemory-policy allkeys-lru`}
        </pre>
        <p>
          Also ideal for sessions, rate limiting (<code>INCR</code> + <code>EXPIRE</code>), and leaderboards (sorted
          sets).
        </p>
      </Section>

      <Section id="references" title="15. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>Redis documentation — redis.io/docs</li>
          <li>Redis eviction policies — redis.io/docs/latest/develop/reference/eviction</li>
        </ul>
      </Section>
    </main>
  );
}
