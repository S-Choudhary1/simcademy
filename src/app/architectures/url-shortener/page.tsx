import Link from "next/link";
import type { Metadata } from "next";
import { EmbeddedSim } from "@/sim/ui/EmbeddedSim";
import { ARCH_BY_SLUG } from "@/sim/architectures";

export const metadata: Metadata = {
  title: "URL Shortener — Architecture",
  description:
    "How a URL shortener is designed: read-heavy redirects served from a cache, unique key generation, and a database that barely moves. Interactive architecture simulation.",
  keywords: ["url shortener", "system design", "cache-aside", "read heavy", "redirect service", "key generation"],
};

const arch = ARCH_BY_SLUG["url-shortener"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function UrlShortenerPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Architectures</span> / <span className="text-slate-300">URL Shortener</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">Architecture</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">URL Shortener</h1>
        <p className="mt-2 text-slate-400">{arch.blurb}</p>
      </header>

      <Section title="1. Business Problem">
        <p>
          Turn a long URL into a short code (like <code>sysv.se/aX9k</code>) and send billions of clicks to the right
          place. Almost every request is a <strong>read</strong> — someone clicking a short link and getting
          redirected. Only a tiny trickle of requests are <strong>writes</strong> — someone creating a new short
          link. And redirects need to be fast: nobody should notice the extra hop.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Create a short code for a long URL.</li>
          <li>Redirect a short code to its long URL (an HTTP 301 or 302 response — the status codes a browser uses to mean &ldquo;go here instead&rdquo;).</li>
          <li>Optional: custom aliases, expiry, click analytics.</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Very low redirect latency (single-digit milliseconds) even at high read volume.</li>
          <li>High availability — a broken redirect is a broken link everywhere it was ever shared.</li>
          <li>Codes are permanent and never deleted, so storage only grows over time.</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          A <strong>load balancer</strong> (a server that spreads incoming traffic across several app servers) sends
          each redirect to one of several identical, <strong>stateless</strong> app servers — stateless just means
          any one of them can handle any request, since none of them remember anything between requests. Those app
          servers check a <strong>cache</strong> (a fast, in-memory lookup) before ever touching the database. Because
          the same handful of links get clicked over and over, almost every lookup is a cache hit. Try raising the
          traffic below and watch the database stay calm, or select the cache and drag its <strong>Hit ratio</strong>{" "}
          down to see what happens as fewer and fewer lookups are served from memory.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          Redirect: browser → load balancer → app server → cache. If the cache already has the mapping (a &ldquo;hit&rdquo;,
          the common case), it returns the long URL immediately. If not (a &ldquo;miss&rdquo;), the app server reads
          the database instead, then saves the result in the cache so the next click is fast. Create: the app server
          generates a unique code, writes the mapping to the database, and caches it right away.
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Key generation</strong> — turn a number into a short code using <strong>base62</strong> (a counting system that uses 62 characters, 0-9/a-z/A-Z, instead of just 0-9). Take an auto-incrementing id (1, 2, 3, ...) or a number drawn from a pre-generated pool, and base62-encode it into something like &ldquo;aX9k&rdquo;. Since every id is unique, the resulting code is unique too — no need to check &ldquo;does this code already exist?&rdquo; before saving it.</li>
          <li><strong>Cache</strong> — holds the recently-used links in memory so most redirects never touch the database. The whole design depends on most clicks hitting a small, popular set of links.</li>
          <li><strong>Database</strong> — just a simple code→URL lookup table. Because a mapping never changes once created, caching it forever is completely safe — there&rsquo;s no stale-data risk to worry about.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          App servers are stateless, so scaling reads is as simple as adding more of them behind the load balancer.
          The cache (plus read replicas — extra copies of the database used only for reading) absorbs most of the
          traffic. Because mappings never change, you can cache them with a long <strong>TTL</strong> (&ldquo;time to
          live&rdquo; — how long a cached entry is kept before it expires), or even push the most popular links out to
          a <strong>CDN</strong> (servers placed close to users around the world) for the fastest possible redirect.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          Select the cache and click <strong>Kill</strong> in the simulation: redirects don&rsquo;t fail over to the
          database — they&rsquo;re rejected outright (watch <strong>Errors</strong> climb while the database stays at
          0% busy), because this simulator models a dead dependency as a hard failure, not a smart client with a
          built-in fallback. In a real cache-aside app, failing open to the database on a cache outage is logic{" "}
          <em>you</em> have to write yourself — without it, a dead cache becomes a full outage even though the
          database behind it is perfectly healthy.
        </p>
        <p>
          The scenario people usually mean by &ldquo;cache stampede&rdquo; is different: not a dead cache, but an{" "}
          <em>empty</em> one (cold start, or a mass-eviction) that still works, just slower, because everything
          misses at once. Drag <strong>Hit ratio</strong> toward 0% instead of killing the node to see that: the
          database&rsquo;s utilisation and latency climb together as more lookups reach it for real. Mitigate it with
          database read replicas, request coalescing (merging duplicate in-flight lookups for the same code into a
          single database call), and warming the cache with the most popular links ahead of time.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          <Link href="/technologies/nginx" className="text-sky-400 hover:text-sky-300">Nginx</Link> or another L7
          load balancer up front, stateless app servers,{" "}
          <Link href="/technologies/redis" className="text-sky-400 hover:text-sky-300">Redis</Link> for the cache, and{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link> (or any
          key-value store) for the mappings.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>Two endpoints — create and redirect — over a tiny code→URL store, with a cache in front:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`POST /shorten   { "url": "https://example.com/very/long" }
             → 201 { "code": "aX9k", "short": "sysv.se/aX9k" }
GET  /aX9k      → 301 Location: https://example.com/very/long

// create: base62-encode a unique id — no need to check for collisions first
const id   = nextId()               // auto-increment or a pre-generated key pool
const code = base62(id)
await db.insert({ code, url })
await cache.set(code, url, "EX", 86400)   // EX 86400 = expire this entry after 1 day

// redirect: cache-aside — mappings never change, so caching is always safe
let url = await cache.get(code)
if (!url) { url = await db.lookup(code); await cache.set(code, url, "EX", 86400) }
return redirect(301, url)`}
        </pre>
      </Section>

      <Section title="11. Alternatives & Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Hash-of-URL</strong> codes (hash the long URL itself, so the same URL always maps to the same short code, avoiding duplicates) vs <strong>counter-based</strong> codes (shorter, but need a central id generator).</li>
          <li><strong>301</strong> redirects get cached by browsers and CDNs, so repeat clicks may never reach your server — fast, but you lose click analytics. <strong>302</strong> redirects aren&rsquo;t cached, so every click hits your server — slower, but you keep full analytics.</li>
          <li>A pure key-value store (DynamoDB, Redis) instead of a relational database, since you never query by anything other than the code.</li>
        </ul>
      </Section>
    </main>
  );
}
