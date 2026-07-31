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
          Stop hammering a failing dependency — fail fast, then probe to recover.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A circuit breaker wraps calls to a dependency and tracks failures. It has three states:{" "}
          <strong className="text-emerald-300">CLOSED</strong> (calls pass through),{" "}
          <strong className="text-red-300">OPEN</strong> (calls fail instantly without touching the dependency), and{" "}
          <strong className="text-amber-300">HALF-OPEN</strong> (a single probe decides whether to recover). Too many
          failures trip it open; a successful probe closes it again.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          When a dependency is down, naive retries pile up — threads block, queues fill, and the failure cascades to
          callers. A breaker converts slow, cascading failure into fast, contained failure, and gives the dependency
          room to recover instead of being hammered.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Flip the dependency to <span className="text-red-300">Failing</span>. After a few failures the breaker trips{" "}
          <span className="text-red-300">OPEN</span> and rejects instantly. Flip it back to{" "}
          <span className="text-emerald-300">Healthy</span> and watch it probe through{" "}
          <span className="text-amber-300">HALF-OPEN</span> and recover.
        </p>
        <CircuitBreakerViz />
      </Section>

      <Section title="Analogy">
        <p>
          An electrical breaker in your home. When there&rsquo;s a fault it trips and cuts the circuit instantly, rather
          than letting current keep flowing and start a fire. You reset it once the fault is fixed.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Service-to-service calls in microservices, via libraries like Resilience4j, Polly, and service meshes
          (Istio/Envoy). Almost always paired with timeouts, retries with backoff, and bulkheads.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Wrap the call; count failures over a rolling window; trip to OPEN at a threshold.</li>
          <li>After a cooldown, move to HALF-OPEN and allow one probe — success closes it, failure re-opens it.</li>
          <li>Use a library (Resilience4j, Polly, Hystrix) or a service mesh (Envoy/Istio) rather than hand-rolling.</li>
          <li>Always pair with a <strong>timeout</strong> (so a hang counts as a failure) and a <strong>fallback</strong>.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fast, contained failure and room for the dependency to recover vs the tuning problem: too sensitive trips on blips, too lax never protects.</li>
          <li>Needs a meaningful fallback — failing fast with no degraded response still breaks the user.</li>
          <li>Adds state and one more thing to observe per dependency.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>No timeout — the breaker can&rsquo;t detect a hang if the call never returns.</li>
          <li>Thresholds too sensitive (trips on blips) or too lax (never protects).</li>
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
