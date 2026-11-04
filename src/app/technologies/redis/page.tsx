import Link from "next/link";
import type { Metadata } from "next";
import { TechSimulator } from "@/sim/ui/TechSimulator";
import { RedisEvictionViz } from "@/concepts/RedisEvictionViz";

export const metadata: Metadata = {
  title: "Redis — Data Types, Internals &amp; Interactive Simulation",
  description:
    "Redis explained end to end: what an in-memory database actually is, every core data type (String, List, Hash, Set, Sorted Set, Bitmap, HyperLogLog, Geospatial, Stream) with real commands, how Redis works internally (single-threaded event loop, RDB/AOF persistence, replication), and an interactive cache simulation.",
  keywords: [
    "Redis",
    "in-memory database",
    "Redis data types",
    "Redis internals",
    "cache",
    "cache-aside",
    "LRU eviction",
    "RDB",
    "AOF",
    "sorted set",
    "HyperLogLog",
  ],
  alternates: { canonical: "/technologies/redis" },
  openGraph: {
    title: "Redis — Data Types, Internals & Interactive Simulation",
    description: "Every Redis data type with real commands, how it works internally, and a live cache simulation.",
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

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
      {children}
    </pre>
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
            Beginner → Advanced
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Redis</h1>
        <p className="mt-2 text-slate-400">
          An in-memory data store that holds data as ready-to-use structures — strings, lists, hashes, sets, sorted
          sets, and more — most often used as a fast cache in front of a slower database, but capable of much more.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          Redis keeps all its data in memory (RAM) instead of on disk, so reads and writes take microseconds instead
          of milliseconds. Its most common job is acting as a <strong>cache</strong>: a small, fast copy of your
          hottest data that sits in front of a larger, slower database. But Redis isn&rsquo;t just a key → string
          cache — every key holds one of several rich data structures (see <strong>Data Types</strong>{" "}below), which
          is why it also shows up as a queue, a leaderboard, a session store, and more.
        </p>
      </Section>

      <Section id="in-memory" title="2. What is an in-memory database?">
        <p>
          Most databases (PostgreSQL, MySQL, MongoDB) keep the primary copy of your data on disk, and use RAM only
          as a cache for the pages they&rsquo;ve recently touched. An <strong>in-memory database</strong>{" "}
          flips that around: the primary copy of your data lives in RAM, and disk — if it&rsquo;s used at all — is
          just a backup for recovery, not where reads and writes actually happen.
        </p>
        <p>
          That one decision is why Redis is fast. As a rough order of magnitude: reading from RAM takes on the order
          of 100 nanoseconds; reading from a fast SSD takes roughly 100 microseconds, about a thousand times slower;
          a spinning hard disk is slower again. Redis skips that gap for every single read and write.
        </p>
        <p>
          The trade-off is that RAM is volatile (it empties on power loss) and far more expensive per gigabyte than
          disk — so an in-memory database only makes sense for data that&rsquo;s small enough to fit in memory and
          hot enough to justify the cost. &ldquo;In-memory&rdquo; also doesn&rsquo;t have to mean &ldquo;disposable&rdquo;:
          see <strong>Persistence</strong>{" "}
          in &ldquo;How Redis works internally&rdquo; below for how Redis protects against losing that data on
          restart or crash.
        </p>
      </Section>

      <Section id="problem" title="3. Why it exists">
        <p>
          Databases are durable but comparatively slow, and they struggle under very high read volume. Most
          real-world traffic is heavily skewed — a small set of keys (think: today&rsquo;s trending posts) gets the
          majority of requests. A cache takes advantage of that skew: keep the hot keys in memory, and the database
          only has to deal with the cache misses.
        </p>
      </Section>

      <Section id="data-types" title="4. Data Types">
        <p>
          Every Redis key holds one value, but that value can be any of several structures, each with its own
          commands that operate on it directly inside Redis — so you can increment a counter, push onto a queue, or
          update a leaderboard without pulling the whole value into your app, changing it, and writing it all back.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">String</h3>
        <p>
          The simplest type: a key maps to one value — text, a number, or raw bytes up to 512MB. Numeric strings
          support atomic increment/decrement, which makes them a natural fit for counters.
        </p>
        <Code>{`SET page:1:views 0
INCR page:1:views              # atomic +1, returns the new value
GET page:1:views
SET session:abc123 "{...}" EX 1800   # value expires in 1800 seconds`}</Code>
        <p>Use case: counters, feature flags, caching a single value, rate-limit counters.</p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">List</h3>
        <p>
          An ordered sequence of values, backed by a linked structure — you push and pop from either end in O(1).
        </p>
        <Code>{`LPUSH queue:emails "welcome:42"   # push to the left (front)
RPUSH queue:emails "welcome:43"   # push to the right (back)
LRANGE queue:emails 0 -1          # read the whole list
BRPOP queue:emails 5              # block up to 5s waiting for an item`}</Code>
        <p>Use case: simple job queues, a user&rsquo;s most recent activity, a feed of recent events.</p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Hash</h3>
        <p>A key that maps to a set of field→value pairs — like a small object or row, stored under one key.</p>
        <Code>{`HSET user:42 name "Asha" plan "pro" logins 1
HGET user:42 name
HINCRBY user:42 logins 1
HGETALL user:42`}</Code>
        <p>
          Use case: storing an object (user profile, shopping cart) without serializing/deserializing JSON on every
          read, and cheaply updating a single field.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Set</h3>
        <p>
          An unordered collection of unique values — duplicates are rejected automatically, and Redis can intersect,
          union, or diff sets directly on the server.
        </p>
        <Code>{`SADD post:1:likes user:7 user:9
SISMEMBER post:1:likes user:7     # 1 (true)
SINTER friends:alice friends:bob  # mutual friends`}</Code>
        <p>Use case: tags, unique-visitor tracking, &ldquo;mutual friends&rdquo; via <code>SINTER</code>.</p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Sorted Set (ZSet)</h3>
        <p>
          Like a Set, but every member also has a numeric score, and Redis keeps members ordered by that score —
          range queries by rank or by score run in O(log N).
        </p>
        <Code>{`ZADD leaderboard 1500 "alice"
ZADD leaderboard 2100 "bob"
ZREVRANGE leaderboard 0 2 WITHSCORES   # top 3, highest score first
ZRANK leaderboard "alice"              # alice's rank (0 = lowest score)`}</Code>
        <p>
          Use case: leaderboards, priority queues, and sliding-window rate limiters (using a timestamp as the
          score).
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Bitmap</h3>
        <p>
          Not a separate type under the hood — a bitmap is a plain String accessed bit-by-bit, which makes it an
          extremely memory-efficient way to track yes/no state for millions of IDs.
        </p>
        <Code>{`SETBIT active:2026-11-04 42 1     # mark user id 42 as active today
GETBIT active:2026-11-04 42       # 1
BITCOUNT active:2026-11-04        # how many users were active today`}</Code>
        <p>
          Use case: daily-active-user tracking at roughly one bit per user, instead of one row per user.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">HyperLogLog</h3>
        <p>
          A probabilistic structure that estimates how many <em>unique</em>{" "}items you&rsquo;ve seen, using a fixed
          ~12KB of memory no matter how many items you add — in exchange for a small, documented margin of error
          (Redis states about 0.81% standard error).
        </p>
        <Code>{`PFADD visitors:2026-11-04 "user:7" "user:9"
PFCOUNT visitors:2026-11-04        # approximate unique count`}</Code>
        <p>
          Use case: approximate unique-visitor or unique-event counts at a scale where an exact Set would use far
          too much memory.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Geospatial</h3>
        <p>
          Stores longitude/latitude pairs — internally it&rsquo;s a Sorted Set scored by a geohash — so you can query
          &ldquo;what&rsquo;s near this point&rdquo; directly on the server.
        </p>
        <Code>{`GEOADD drivers -122.42 37.77 "driver:12"
GEOSEARCH drivers FROMLONLAT -122.41 37.78 BYRADIUS 5 km ASC`}</Code>
        <p>Use case: &ldquo;find nearby drivers/stores&rdquo; queries, as in ride-hailing or store-locator features.</p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Stream</h3>
        <p>
          An append-only log of entries, each with an auto-generated ID — closer to Kafka than to a List. Multiple{" "}
          <strong>consumer groups</strong>{" "}can read the same stream independently, each tracking its own position,
          with acknowledgement so a crashed consumer&rsquo;s unprocessed entries can be retried.
        </p>
        <Code>{`XADD orders * orderId 1042 status "created"
XRANGE orders - +                                  # read the whole log
XREADGROUP GROUP pickers worker-1 COUNT 1 STREAMS orders ">"`}</Code>
        <p>
          Use case: event sourcing, activity feeds, and lightweight pipelines that need replay and consumer
          groups — see also{" "}
          <Link href="/concepts/event-sourcing" className="text-sky-400 hover:text-sky-300">Event Sourcing</Link>.
        </p>

        <p className="mt-5">
          <strong>Pub/Sub</strong>{" "}is a related but separate feature, not a stored data type —{" "}
          <code>PUBLISH</code>/<code>SUBSCRIBE</code>{" "}deliver a message to whoever is listening right now, with
          nothing stored and nothing to replay. Reach for a Stream instead of Pub/Sub whenever a subscriber might be
          offline when the message is sent, or you need history.
        </p>
      </Section>

      <Section id="simulation" title="5. Interactive Simulation">
        <p>
          Press <strong>Play</strong>{" "}to start traffic flowing (drag <strong>Traffic</strong>{" "}to change the request
          rate). Then click the <strong>Redis</strong>{" "}box in the diagram to open the <strong>Inspector</strong>{" "}on
          the right — its <strong>Hit ratio</strong>{" "}slider is the one that matters here: it controls what share of
          reads this simulated cache answers itself versus passing through to the <strong>Database</strong>. Drag it
          down and watch <strong>p50/p95/p99</strong>{" "}climb and the Database&rsquo;s utilisation rise, exactly like a
          real cache losing effectiveness.
        </p>
        <p>
          With the Redis node still selected, try the <strong>Chaos</strong>{" "}buttons: <strong>Kill</strong>{" "}simulates
          the cache going down completely. In this simulator a dead node <em>rejects</em>{" "}every request that reaches
          it (you&rsquo;ll see <strong>Errors</strong>{" "}jump), rather than quietly falling back to the database — a
          reminder that a cache with no fallback logic in front of it is a single point of failure, not a safety net.{" "}
          <strong>Recover</strong>{" "}brings it back; <strong>Slow</strong>, <strong>Partition</strong>, and{" "}
          <strong>Flaky</strong>{" "}model other ways a dependency can misbehave.
        </p>
        <TechSimulator tech="redis" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: eviction policies</h3>
        <p>
          When the cache hits its memory limit, adding a new key means evicting an existing one. Fill the cache, then
          read a fresh key and watch which one gets evicted under <strong>LRU</strong>{" "}(evicts whichever key hasn&rsquo;t
          been used in the longest time), <strong>LFU</strong>{" "}(evicts whichever key has been used the fewest times),
          or <strong>random</strong>{" "}(no bookkeeping — just picks one).
        </p>
        <RedisEvictionViz />
      </Section>

      <Section id="architecture" title="6. Architecture (Cache-Aside)">
        <p>
          The most common pattern is <strong>cache-aside</strong>: your application checks Redis first. On a hit, it
          returns the value immediately. On a miss, it reads the database itself, writes that value back into Redis
          for next time, and returns it. Redis doesn&rsquo;t know the database exists — your application is the one
          coordinating both.
        </p>
      </Section>

      <Section id="lifecycle" title="7. Request Lifecycle">
        <p>
          A read works like this: <code>GET key</code> → a hit returns in about a millisecond; a miss triggers a
          database query (around 50ms in this simulation), then a write-back into the cache, then the response to the
          caller. Because the value is now cached, the <em>next</em>{" "}request for that same key is a hit — this is how
          a cold cache &ldquo;warms up&rdquo; over time.
        </p>
      </Section>

      <Section id="hit-miss" title="8. Cache Hits &amp; Misses">
        <p>
          Every read against a cache ends in exactly one of two outcomes: a <strong>hit</strong>{" "}(the key was found,
          so Redis answers directly, in roughly a millisecond) or a <strong>miss</strong>{" "}(the key wasn&rsquo;t
          there, so the caller has to go fetch it from the real source — typically the database — which is many
          times slower, as in Request Lifecycle above).
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Hit ratio</h3>
        <p>
          The single most important cache number: <code>hit ratio = hits / (hits + misses)</code>. A 90% hit ratio
          means 9 out of 10 reads are fast; the other 1 pays the full miss penalty. Because the miss path is so much
          slower than the hit path, even a modest drop in hit ratio (say 95% → 85%) can more than double your
          average latency — which is exactly what <strong>effective latency</strong>{" "}measures in the Metrics section
          below.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Why a miss happens</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Cold / first-time miss</strong> — nobody has asked for this key yet, so it was never cached. Unavoidable on the very first request for any key.</li>
          <li><strong>Capacity miss</strong> — the key was cached before but got evicted to make room for something else, because the cache is smaller than the working set (see Eviction policies above).</li>
          <li><strong>Invalidation miss</strong> — the key was cached but was explicitly removed or expired (TTL) because the underlying data changed, so the stale copy could no longer be trusted.</li>
        </ul>
        <p>
          Knowing which kind of miss you&rsquo;re seeing tells you what to fix: cold misses call for cache warming,
          capacity misses call for a bigger cache or a smarter eviction policy, invalidation misses call for a
          longer TTL or smarter invalidation.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Caching strategies (how a miss gets filled)</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Cache-aside (lazy loading)</strong> — the app checks the cache itself, and on a miss, loads from the database and writes the result into the cache. This is what the simulation above models, and the most common pattern in practice.</li>
          <li><strong>Read-through</strong> — same idea, but the cache (or a library sitting in front of it) knows how to load from the database itself, so the app only ever talks to the cache and never handles a miss directly.</li>
          <li><strong>Write-through</strong> — writes go to the cache first, and the cache synchronously writes the same value to the database before returning. Keeps cache and database in lockstep, at the cost of every write also paying the database&rsquo;s latency.</li>
          <li><strong>Write-behind (write-back)</strong> — writes land in the cache immediately and return fast; the cache flushes to the database asynchronously, later. Much faster writes, but a cache failure before that flush can lose data.</li>
          <li><strong>Write-around</strong> — writes go straight to the database, skipping the cache entirely; the cache only gets populated later via a normal cache-aside read. Avoids filling the cache with data that&rsquo;s written once and rarely read.</li>
        </ul>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Two extra tricks worth knowing</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Negative caching</strong> — cache the fact that a key doesn&rsquo;t exist (e.g. &ldquo;no user with this ID&rdquo;) for a short TTL, not just successful lookups. Without this, a request for a nonexistent key is a guaranteed miss every single time — a common way to accidentally hammer a database.</li>
          <li><strong>Cache warming</strong> — pre-load expected hot keys before real traffic arrives (e.g. right after a deploy or a flush), instead of letting every key start as a cold miss. Directly addresses the stampede scenario in Failure Scenarios below.</li>
        </ul>
      </Section>

      <Section id="internals" title="9. How Redis Works Internally">
        <p>Redis&rsquo;s speed comes from a short list of deliberate design choices working together:</p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Single-threaded command execution</h3>
        <p>
          One thread runs your commands, one at a time — nothing ever runs in parallel against the same data, so
          there&rsquo;s no locking between commands. Redis makes up for not spreading work across cores by using{" "}
          <strong>I/O multiplexing</strong>{" "}(<code>epoll</code>{" "}on Linux, <code>kqueue</code>{" "}on macOS/BSD): one
          thread can watch thousands of client connections at once and process whichever ones have data ready,
          without the overhead of a thread per connection. Since most Redis operations are O(1) or O(log N) on
          already-in-memory data, a single core is enough to handle hundreds of thousands of operations per second.
          Since Redis 6, a few extra threads can handle reading/writing the network socket itself, but command
          execution against your data stays single-threaded.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Purpose-built data structures</h3>
        <p>
          Each data type is backed by a structure chosen for how it&rsquo;s actually accessed: small Lists and Hashes
          use a compact encoding and are only promoted to a full linked list or hash table once they grow past a size
          threshold; a Sorted Set is really a hash table (for O(1) &ldquo;what&rsquo;s this member&rsquo;s
          score&rdquo;) paired with a <strong>skip list</strong>{" "}(for fast ordered range scans) under the same key.
        </p>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Persistence — &ldquo;in-memory&rdquo; doesn&rsquo;t have to mean &ldquo;disposable&rdquo;</h3>
        <p>Redis can survive a restart two ways, and production deployments typically use one or both:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>RDB snapshots</strong> — a point-in-time binary dump of the whole dataset. Redis forks a child
            process to write the snapshot while the parent keeps serving traffic (using copy-on-write memory, so the
            fork itself is cheap). Fast to reload on restart, but you can lose everything written since the last
            snapshot.
          </li>
          <li>
            <strong>AOF (Append-Only File)</strong> — every write command is appended to a log and replayed in order
            on restart. The <code>appendfsync</code>{" "}setting trades durability for speed: <code>always</code>{" "}(fsync
            every write — slowest, safest), <code>everysec</code>{" "}(the common default — loses at most about a
            second of writes), or <code>no</code>{" "}(fastest — the OS decides when to flush).
          </li>
          <li>You can run both together: Redis loads the RDB snapshot first, then replays the AOF entries written since — a faster restart than AOF alone, with less potential data loss than RDB alone.</li>
          <li>Turn both off, and Redis is purely in-memory: fastest possible, but a crash or restart loses everything.</li>
        </ul>

        <h3 className="mt-5 text-base font-semibold text-slate-100">Replication</h3>
        <p>
          A Redis replica keeps an asynchronous copy of a leader&rsquo;s data (see{" "}
          <Link href="/concepts/replication" className="text-sky-400 hover:text-sky-300">Replication</Link>).{" "}
          <strong>Redis Sentinel</strong>{" "}watches a leader/replica pair and promotes a replica automatically if the
          leader disappears. <strong>Redis Cluster</strong>{" "}combines that with the hash-slot sharding described below,
          so capacity and availability scale together.
        </p>
      </Section>

      <Section id="scaling" title="10. Scaling">
        <p>
          Scale read capacity with replicas; scale total capacity with Redis Cluster, which splits the key space
          across nodes using 16,384 fixed <strong>hash slots</strong> — a different approach from classic consistent
          hashing, which Redis deliberately avoids because fixed slots make rebalancing simpler to reason about. In
          the simulation, a cache far smaller than the total keyspace can still reach a high hit ratio, because
          traffic is skewed toward a small set of hot keys.
        </p>
      </Section>

      <Section id="failure" title="11. Failure Scenarios">
        <p>
          Select the Redis node and click <strong>Kill</strong>{" "}in the Inspector&rsquo;s Chaos panel: every request
          that reaches it is now dropped as an error, because this simulator models a dead dependency as a hard
          failure rather than a smart client that catches the error and queries the database directly — in a real
          cache-aside app, that fallback is something <em>you</em>{" "}have to write. <strong>Partition</strong>{" "}and{" "}
          <strong>Flaky</strong>{" "}show different failure shapes (total loss vs. intermittent failures) worth comparing
          against a clean <strong>Kill</strong>.
        </p>
        <p>
          For the real-world &ldquo;empty cache, sudden stampede&rdquo; scenario, use the <strong>eviction demo
          above</strong>{" "}instead: fill it with keys, hit <strong>Reset</strong>{" "}to simulate a flush, and every
          subsequent access starts out as a miss — which is exactly why production systems lean on request
          coalescing (letting only one request fetch a given key while others wait for its result) and staggered
          TTLs, so keys don&rsquo;t all expire at the same moment.
        </p>
      </Section>

      <Section id="metrics" title="12. Metrics">
        <p>
          <strong>Hit ratio</strong>{" "}is the headline number — everything else follows from it.{" "}
          <strong>Effective latency</strong>{" "}is a weighted blend of the fast hit path and the slow miss path, so even
          a small drop in hit ratio can cause a surprisingly large jump in latency. <strong>Database load</strong>{" "}
          is simply the miss rate — the cache&rsquo;s entire job is to keep that number small.
        </p>
      </Section>

      <Section id="tradeoffs" title="13. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Speed vs. freshness — cached data can be stale until it expires or is explicitly invalidated.</li>
          <li>Memory is expensive, so you cache the hot subset of your data, not everything.</li>
          <li>Adds a consistency problem of its own: the cache and the database can disagree, and keeping them in sync (invalidation) is genuinely hard.</li>
          <li>Rich data types are convenient, but each one adds its own memory/complexity trade-off — e.g. HyperLogLog trades exactness for a fixed, tiny memory footprint.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="14. Comparisons">
        <p>
          See <span className="text-slate-400">Redis vs Memcached</span> (coming soon): both are
          in-memory caches; Redis adds rich data structures, persistence, replication, and
          scripting, while Memcached is a leaner, multi-threaded, pure cache.
        </p>
      </Section>

      <Section id="usage" title="15. Real-world Usage">
        <p>
          Session stores (Hash/String), rate limiters (<code>INCR</code> + <code>EXPIRE</code>), leaderboards (Sorted
          Set), job queues (List/Stream), approximate unique counts (HyperLogLog), geo-proximity search
          (Geospatial) — and, most of all, read-through caching in front of relational and document databases.
          Ubiquitous across web-scale backends.
        </p>
      </Section>

      <Section id="related" title="16. Related Concepts">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/consistent-hashing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Consistent Hashing</Link>
          <Link href="/concepts/replication" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Replication</Link>
          {["Cache Invalidation", "LRU", "TTL", "Thundering Herd"].map((c) => (
            <span key={c} className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">
              {c}
            </span>
          ))}
        </p>
      </Section>

      <Section id="interview" title="17. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Why can a cache much smaller than the keyspace still have a high hit ratio?</li>
          <li>Walk through the cache-aside read and write paths.</li>
          <li>What is a cache stampede, and how do you prevent it?</li>
          <li>How does effective latency depend on hit ratio, and why is it non-linear in impact?</li>
          <li>What&rsquo;s the difference between a cold miss, a capacity miss, and an invalidation miss?</li>
          <li>Compare cache-aside, read-through, write-through, and write-behind — what does each trade off?</li>
          <li>What is negative caching, and why does skipping it hurt a database under certain traffic patterns?</li>
          <li>Redis is single-threaded for command execution — why doesn&rsquo;t that make it slow?</li>
          <li>What&rsquo;s the difference between RDB and AOF persistence, and when would you pick each (or both)?</li>
          <li>When would you reach for a Sorted Set instead of a List or a plain String?</li>
        </ol>
      </Section>

      <Section id="how-to-use" title="18. How to use it">
        <p>The canonical cache-aside read, plus an eviction policy so memory stays bounded:</p>
        <Code>{`let value = await redis.get(key)
if (value === null) {                    // miss → load and backfill
  value = await db.load(key)
  await redis.set(key, value, "EX", 300) // TTL 5 min
}
return value

# redis.conf — cap memory and evict the least-recently-used keys
maxmemory 4gb
maxmemory-policy allkeys-lru`}</Code>
        <p>
          Also ideal for sessions (Hash), rate limiting (<code>INCR</code> + <code>EXPIRE</code>), and leaderboards
          (Sorted Set) — see <strong>Data Types</strong>{" "}above for the commands behind each.
        </p>
      </Section>

      <Section id="references" title="19. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>Redis documentation — redis.io/docs</li>
          <li>Redis data types — redis.io/docs/latest/develop/data-types</li>
          <li>Redis persistence (RDB/AOF) — redis.io/docs/latest/operate/oss_and_stack/management/persistence</li>
          <li>Redis eviction policies — redis.io/docs/latest/develop/reference/eviction</li>
        </ul>
      </Section>
    </main>
  );
}
