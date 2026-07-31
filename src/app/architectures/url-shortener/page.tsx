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
          Turn long URLs into short codes (like <code>sysv.se/aX9k</code>) and redirect billions of clicks to the
          originals. The workload is overwhelmingly <strong>reads</strong> (redirects) with a small trickle of writes
          (new short links) — and redirects must be fast.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Create a short code for a long URL.</li>
          <li>Redirect a short code to its long URL (a 301/302).</li>
          <li>Optional: custom aliases, expiry, click analytics.</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Very low redirect latency (single-digit ms) at high read volume.</li>
          <li>High availability — a broken redirect is a broken link everywhere it was shared.</li>
          <li>Codes are permanent, so storage grows forever.</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          A load balancer spreads redirects across stateless app servers that read through a cache to the database.
          Because the same links are hit repeatedly, the cache hit ratio is high — raise the traffic and the database
          stays calm, or kill the cache to see it get slammed.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          Redirect: browser → load balancer → app server → cache. On a hit (the common case) it returns the long URL
          immediately; on a miss it reads the database and populates the cache. Create: the app generates a unique
          code, writes the mapping to the database, and caches it.
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Key generation</strong> — base-62 of an auto-increment id, or a pre-generated key pool, avoids collisions without a read-before-write.</li>
          <li><strong>Cache</strong> — holds the hot links; the whole design leans on a high hit ratio.</li>
          <li><strong>Database</strong> — a simple key→URL store; the mapping is immutable, which makes caching trivially safe.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          App servers are stateless — add more behind the load balancer. Reads scale with the cache (and read
          replicas). Because mappings never change, you can cache aggressively with long TTLs and even push hot links
          to a CDN edge.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          Kill the cache in the simulation: every redirect falls through to the database and latency/DB load spike — a
          cold-cache stampede. Mitigate with replicas, request coalescing, and warming the cache for the hottest links.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          <Link href="/technologies/nginx" className="text-sky-400 hover:text-sky-300">Nginx</Link> or an L7 balancer
          up front, stateless app servers,{" "}
          <Link href="/technologies/redis" className="text-sky-400 hover:text-sky-300">Redis</Link> for the cache, and{" "}
          <Link href="/technologies/postgresql" className="text-sky-400 hover:text-sky-300">PostgreSQL</Link> (or any
          KV store) for the mappings.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>Two endpoints — create and redirect — over a tiny key→URL store, cache in front:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`POST /shorten   { "url": "https://example.com/very/long" }
             → 201 { "code": "aX9k", "short": "sysv.se/aX9k" }
GET  /aX9k      → 301 Location: https://example.com/very/long

// create: base62 of a unique id avoids collisions with no read-before-write
const id   = nextId()               // auto-increment or a pre-generated key pool
const code = base62(id)
await db.insert({ code, url })
await cache.set(code, url, "EX", 86400)

// redirect: cache-aside, mappings are immutable so caching is safe
let url = await cache.get(code)
if (!url) { url = await db.lookup(code); await cache.set(code, url, "EX", 86400) }
return redirect(301, url)`}
        </pre>
      </Section>

      <Section title="11. Alternatives & Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Hash-of-URL codes (dedupe identical URLs) vs counter-based (shorter, sequential) codes.</li>
          <li>301 (cacheable, loses analytics) vs 302 (every click hits you, keeps analytics).</li>
          <li>A pure KV store (DynamoDB/Redis) instead of a relational DB when you don&rsquo;t need queries.</li>
        </ul>
      </Section>
    </main>
  );
}
