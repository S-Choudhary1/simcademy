import Link from "next/link";
import type { Metadata } from "next";
import { CircuitBreakerViz } from "@/concepts/CircuitBreakerViz";

export const metadata: Metadata = {
  title: "Circuit Breaker — Interactive Concept",
  description:
    "The Circuit Breaker pattern explained with an interactive state machine: watch it trip OPEN on failures, fail fast, then probe and recover through HALF-OPEN.",
  keywords: ["circuit breaker", "resilience", "fail fast", "fault tolerance", "half-open", "microservices"],
  alternates: { canonical: "/concepts/circuit-breaker" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function CircuitBreakerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Circuit Breaker</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">
          Concept
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Circuit Breaker</h1>
        <p className="mt-2 text-slate-400">
          Stop hammering a dependency that&rsquo;s already failing — fail fast instead, then probe it to see if it has
          recovered.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A circuit breaker sits in front of a call to another service (a &ldquo;dependency&rdquo;) and keeps track of
          how often that call fails. It has three states:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-emerald-300">CLOSED</strong>: normal operation — every call goes through to the dependency.</li>
          <li><strong className="text-red-300">OPEN</strong>: the dependency looks unhealthy — calls fail instantly, without even trying to reach it.</li>
          <li><strong className="text-amber-300">HALF-OPEN</strong>: recovering — exactly one test call decides whether to go back to normal.</li>
        </ul>
        <p>Enough failures in a row trip it from CLOSED to OPEN; a successful test call in HALF-OPEN closes it again.</p>
      </Section>

      <Section title="The problem it solves">
        <p>
          When a dependency goes down, code that keeps retrying it anyway makes things worse: threads pile up waiting
          for a response, queues fill, and the one failing dependency drags down everything that calls it. A circuit
          breaker turns that slow, spreading failure into a fast, contained one — and gives the dependency room to
          recover instead of getting hit with more traffic while it&rsquo;s already struggling.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Flip the dependency to <span className="text-red-300">Failing</span>. After a few failures, the breaker
          trips <span className="text-red-300">OPEN</span> and starts rejecting calls instantly. Flip the dependency
          back to <span className="text-emerald-300">Healthy</span> and watch the breaker probe it through{" "}
          <span className="text-amber-300">HALF-OPEN</span> before fully recovering.
        </p>
        <CircuitBreakerViz />
      </Section>

      <Section title="Analogy">
        <p>
          An electrical breaker in your home. When there&rsquo;s a fault, it trips and cuts the circuit instantly,
          rather than letting current keep flowing and start a fire. You reset it once the fault is fixed.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Service-to-service calls in microservices, via libraries like Resilience4j and Polly, and in service meshes
          like Istio/Envoy. It&rsquo;s almost always paired with timeouts, retries with backoff, and bulkheads
          (limiting how many concurrent calls one dependency can use).
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Wrap the call; count failures over a rolling window of recent calls; trip to OPEN once failures cross a threshold.</li>
          <li>After a cooldown period, move to HALF-OPEN and allow exactly one test call through — success closes the breaker, failure sends it back to OPEN.</li>
          <li>Use an existing library (Resilience4j, Polly) or a service mesh (Envoy/Istio) instead of hand-rolling the state machine.</li>
        </ul>
        <p>For example, Resilience4j lets you configure those thresholds directly:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)                          // trip OPEN at 50% failures
    .slidingWindowSize(10)                             // measured over the last 10 calls
    .waitDurationInOpenState(Duration.ofSeconds(30))   // stay OPEN this long before probing
    .build();`}
        </pre>
        <p>
          Always pair it with a <strong>timeout</strong>{" "}(so a hang counts as a failure instead of waiting forever)
          and a <strong>fallback</strong>{" "}(so failing fast still returns something useful to the caller).
        </p>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fast, contained failure and recovery room for the dependency vs a tuning problem: too sensitive trips on harmless blips, too lax never protects anything.</li>
          <li>Needs a meaningful fallback — failing fast with no degraded response still breaks the user&rsquo;s experience.</li>
          <li>Adds one more piece of state, per dependency, that you need to monitor.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>No timeout — the breaker can&rsquo;t detect a hang if the call never returns in the first place.</li>
          <li>Thresholds set too sensitive (trips on blips) or too lax (never actually protects anything).</li>
          <li>No fallback — failing fast with no degraded response still breaks the user experience.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/rate-limiting" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Rate Limiting</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Retry &amp; Backoff</span>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Bulkhead</span>
        </p>
      </Section>
    </main>
  );
}
