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
          A rate limiter caps how many requests a client — or the whole system — is allowed to make in a given
          stretch of time, and rejects anything over that, usually with an HTTP{" "}
          <code>429 Too Many Requests</code> response. It protects a service from being overloaded, abused, or
          running up a huge bill from a runaway client. The interesting part is <em>how</em> the limit gets enforced —
          the algorithm decides whether a sudden burst of requests gets let through or cut off.
        </p>
      </Section>

      <Section title="Analogy">
        <p>
          A nightclub doorman who only lets people in at a certain pace, no matter how big the crowd outside gets.
          Some doormen let a small group in all at once if nobody&rsquo;s come in for a while (a burst) — others
          insist on a strict, steady trickle no matter what. The five algorithms below are just different doorman
          policies.
        </p>
      </Section>

      <Section title="The algorithms">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Token Bucket</strong> — tokens refill at a steady rate, up to a maximum bucket size. Every
            request spends one token. If the bucket is full, it can absorb a sudden burst all at once. The most
            common choice for public APIs.
          </li>
          <li>
            <strong>Leaky Bucket</strong> — incoming requests join a queue that drains at a constant rate, turning
            bursty traffic into a smooth, steady stream. Anything that doesn&rsquo;t fit in the queue is dropped.
          </li>
          <li>
            <strong>Fixed Window</strong> — a simple counter for each time slot (e.g. &ldquo;this minute&rdquo;),
            reset at the start of the next slot. Easy to build, but two slots back-to-back can let through up to
            double the intended burst right at the boundary.
          </li>
          <li>
            <strong>Sliding Window (counter)</strong> — a smarter fixed window: it blends in part of the previous
            window&rsquo;s count to smooth out that boundary burst, without remembering every single request. Cheap,
            constant-memory, and an approximation rather than exact.
          </li>
          <li>
            <strong>Sliding Window (log)</strong> — keeps an exact timestamp for every request in the last window, so
            the count is always exact. Accurate, but memory grows with how many requests each client can make.
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

      <Section title="Where it&rsquo;s used">
        <p>
          Public APIs (Stripe, GitHub, Twitter) use it so one noisy user can&rsquo;t drown out everyone else. API
          gateways and CDNs (Cloudflare, AWS API Gateway, nginx) apply it at the edge, before traffic even reaches
          your own servers.
        </p>
      </Section>

      <Section title="How to implement">
        <p>
          For a single process, an in-memory token bucket is enough — there&rsquo;s no shared state to worry about.
          For a cluster of servers, everyone needs to agree on one shared count, which usually means keeping the
          state in Redis:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`# Fixed window, keyed per user (atomic-ish):
count = INCR  rate:{user}:{minute}
        EXPIRE rate:{user}:{minute} 60   # first hit only
if count > LIMIT: return 429 (Retry-After: ...)

# Token bucket / sliding window: run a small Lua script so the
# read-modify-write is atomic on the Redis server.`}
        </pre>
        <ul className="list-disc space-y-1 pl-5">
          <li>Key the counter by user, IP, or API key, and return <code>429</code> with a <code>Retry-After</code> header so clients know when to try again.</li>
          <li>Enforce it at the edge (gateway/CDN) so excess traffic never even reaches your own services.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Limiting per-server is simple, but N servers each enforcing the same limit independently effectively allows N× the intended total — real global limiting needs shared state (like Redis), which adds latency and a dependency.</li>
          <li>Algorithm choice is a trade-off between tolerating bursts (token bucket) and keeping traffic smooth and steady (leaky bucket, sliding window).</li>
          <li>Set the limit too tight and you reject real users during normal bursts; too loose and it stops protecting the backend at all.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Using a fixed window and not realizing two back-to-back windows can let through double the intended burst.</li>
          <li>Limiting per-server instead of globally — distributed limiting needs shared state, usually Redis.</li>
          <li>Skipping the <code>Retry-After</code> header, so rejected clients immediately retry instead of backing off.</li>
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
