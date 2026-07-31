import Link from "next/link";
import type { Metadata } from "next";
import { RetryBackoffViz } from "@/concepts/RetryBackoffViz";

export const metadata: Metadata = {
  title: "Retries, Backoff & Jitter — Interactive Concept",
  description:
    "Why naive retries cause a thundering herd, and how exponential backoff with jitter fixes it. Visualize five clients retrying under immediate, fixed, exponential, and jittered strategies and see the load spikes each produces.",
  keywords: ["retry", "exponential backoff", "jitter", "thundering herd", "retry storm", "backoff", "resilience", "rate limiting", "circuit breaker", "retry budget"],
  alternates: { canonical: "/concepts/retries-backoff" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function RetriesBackoffPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Retries, Backoff &amp; Jitter</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Retries, Backoff &amp; Jitter</h1>
        <p className="mt-2 text-slate-400">
          Retrying a failed request is obvious. Retrying <em>well</em> is not — done naively, retries turn a brief blip
          into a self-inflicted outage.
        </p>
      </header>

      <Section title="The thundering herd">
        <p>
          When a service hiccups, every client fails at once — and if they all retry on the same schedule, they hit the
          recovering service in a synchronized <strong>spike</strong> that knocks it back down. This is the{" "}
          <strong>thundering herd</strong> (or retry storm). The fix is to make retries both <em>patient</em> and{" "}
          <em>desynchronized</em>.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Five clients fail at the same instant. Switch between strategies and watch two things: the{" "}
          <strong>timeline</strong> (when each client retries) and the <strong>load histogram</strong> (how many retries
          hit each second). Naive strategies produce tall synchronized bars; <strong>exponential backoff + jitter</strong>{" "}
          flattens them.
        </p>
        <RetryBackoffViz />
      </Section>

      <Section title="The rules of good retries">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Exponential backoff</strong> — double the wait each attempt so a struggling service gets breathing room.</li>
          <li><strong>Jitter</strong> — randomize each delay so clients don&rsquo;t retry in lock-step. AWS&rsquo;s recommendation is &ldquo;full jitter&rdquo;: <code>sleep = random(0, base · 2^attempt)</code>.</li>
          <li><strong>Cap attempts &amp; total time</strong> — give up eventually; infinite retries just move the outage.</li>
          <li><strong>Only retry idempotent / retriable errors</strong> — never blindly retry a non-idempotent write, and never retry a 4xx.</li>
          <li>Pair retries with a <Link href="/concepts/circuit-breaker" className="text-sky-400 hover:text-sky-300">circuit breaker</Link> so you stop hammering a dependency that&rsquo;s clearly down.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/circuit-breaker" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Circuit Breaker</Link>
          <Link href="/concepts/idempotency" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Idempotency</Link>
          <Link href="/concepts/rate-limiting" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Rate Limiting</Link>
        </p>
      </Section>
    </main>
  );
}
