import Link from "next/link";
import type { Metadata } from "next";
import { RateLimitViz } from "@/concepts/RateLimitViz";
import { TopicMeme } from "@/components/memes";

export const metadata: Metadata = {
  title: "Rate Limiting Algorithms — Interactive Concept",
  description:
    "Compare rate-limiting algorithms — Token Bucket, Leaky Bucket, Fixed Window, Sliding Window counter & log — side by side under the same traffic, each with its own tunable parameters and implementation pseudocode.",
  keywords: ["rate limiting", "token bucket", "leaky bucket", "fixed window", "sliding window", "throttling", "429"],
  alternates: { canonical: "/concepts/rate-limiting" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function RateLimitingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Rate Limiting</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
          Concept
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Rate Limiting</h1>
        <p className="mt-2 text-slate-400">
          Cap how many requests a client can make — five algorithms, each with different burst behaviour.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A rate limiter caps the request rate a client (or the whole system) is allowed, rejecting the excess —
          usually with HTTP <code>429 Too Many Requests</code>. It protects services from overload, abuse, and runaway
          costs. The interesting part is <em>how</em> the limit is enforced: the algorithm decides how bursts are
          treated.
        </p>
      </Section>

      <Section title="The algorithms">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Token Bucket</strong> — tokens refill at a steady rate up to a bucket size; a request spends a
            token. A full bucket absorbs a burst. Most common for public APIs.
          </li>
          <li>
            <strong>Leaky Bucket</strong> — arrivals join a queue that drains at a constant rate, smoothing spiky
            traffic into a steady output. Overflow is dropped.
          </li>
          <li>
            <strong>Fixed Window</strong> — a counter per fixed interval (e.g. per minute) that resets each window.
            Simple, but two back-to-back windows can allow a 2× burst at the boundary.
          </li>
          <li>
            <strong>Sliding Window (counter)</strong> — weights the previous window&rsquo;s count to smooth out the
            fixed-window edge burst, without storing every request timestamp. An O(1)-memory approximation.
          </li>
          <li>
            <strong>Sliding Window (log)</strong> — keeps a timestamp for every admitted request in the last window and
            counts exactly how many fall inside it. Precise, but O(N) memory per client.
          </li>
        </ul>
      </Section>

      <Section title="Compare them live">
        <p>
          The same deterministic, varying traffic is fed to all five, but <strong>each algorithm has its own real
          parameters</strong> — a leaky bucket&rsquo;s leak rate is separate from a token bucket&rsquo;s refill rate.
          Tune them, hit <span className="text-fuchsia-300">Send burst</span>, and watch how differently each admits and
          rejects. Press <span className="font-mono text-slate-300">&lt;/&gt;</span> on any card to see its
          implementation.
        </p>
        <RateLimitViz />
      </Section>

      <Section title="Which one should I use?">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Token Bucket</strong>: general-purpose API limits that should tolerate short bursts.</li>
          <li><strong>Leaky Bucket</strong>: when a downstream needs a strictly steady rate (billing, third-party APIs).</li>
          <li><strong>Fixed Window</strong>: simple quotas where an occasional edge burst is fine.</li>
          <li><strong>Sliding Window</strong>: fair per-user limits where edge bursts matter but you can&rsquo;t store every timestamp.</li>
        </ul>
      </Section>

      <Section title="How to implement">
        <p>For a single process, an in-memory token bucket is enough. For a cluster, keep the state in Redis so all nodes share one limit:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`# Fixed window, keyed per user (atomic-ish):
count = INCR  rate:{user}:{minute}
        EXPIRE rate:{user}:{minute} 60   # first hit only
if count > LIMIT: return 429 (Retry-After: ...)

# Token bucket / sliding window: run a small Lua script so the
# read-modify-write is atomic on the Redis server.`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Key by user, IP, or API key; return <code>429</code> with a <code>Retry-After</code> header.</li>
          <li>Do it at the edge (gateway/CDN) so junk traffic never reaches your services.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Per-node limiting is simple but lets N nodes together allow N× the limit; global limiting needs shared state (Redis) → extra latency and a dependency.</li>
          <li>Algorithm choice trades burst tolerance (token bucket) against smoothness (leaky/sliding window).</li>
          <li>Set limits too tight and you reject legitimate bursts; too loose and you don&rsquo;t protect the backend.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fixed windows allowing double the intended burst at the boundary.</li>
          <li>Limiting per-server instead of globally (distributed limiting needs shared state, e.g. Redis).</li>
          <li>No <code>Retry-After</code> header, so clients hammer immediately after a 429.</li>
        </ul>
      </Section>

      <div className="mt-8"><TopicMeme topic="rate-limiting" /></div>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/circuit-breaker" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Circuit Breaker</Link>
          <Link href="/technologies/redis" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Redis</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Backpressure</span>
        </p>
      </Section>
    </main>
  );
}
