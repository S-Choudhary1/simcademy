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
          Retrying a failed request is obvious. Retrying <em>well</em>{" "}is not — done naively, retries turn a brief blip
          into a self-inflicted outage.
        </p>
      </header>

      <Section title="Definition">
        <p>
          A <strong>retry</strong>{" "}is just sending a failed request again. Two choices turn a retry from dangerous into
          safe: <strong>backoff</strong>{" "}(how long to wait before trying again — usually longer each time) and{" "}
          <strong>jitter</strong>{" "}(adding randomness to that wait so many clients don&rsquo;t all retry at the exact
          same moment).
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          When a service hiccups, every client calling it tends to fail at the same instant. If they all retry on the
          same fixed schedule, they hit the recovering service in one synchronized <strong>spike</strong>{" "}that knocks
          it back down — right as it was starting to recover. This is called a <strong>thundering herd</strong>{" "}(or
          retry storm). The fix is to make retries both <em>patient</em>{" "}(wait longer each time) and{" "}
          <em>desynchronized</em>{" "}(don&rsquo;t let everyone wait the exact same amount of time).
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Five clients all fail at the same instant. Switch between strategies and watch two things: the{" "}
          <strong>timeline</strong>{" "}(when each client retries) and the <strong>load histogram</strong>{" "}(how many
          retries hit the service each second). Naive strategies produce tall synchronized bars — the thundering herd
          in action. <strong>Exponential backoff + jitter</strong>{" "}flattens them into a steady trickle.
        </p>
        <RetryBackoffViz />
      </Section>

      <Section title="Analogy">
        <p>
          A restaurant reopens right after a small kitchen fire. If every customer who was waiting outside walks back
          in at the exact same minute the doors open, the kitchen gets slammed all over again before it&rsquo;s ready.
          If the same customers trickle back in over the next 20 minutes at random times, the kitchen serves the exact
          same number of people — just without the crush at the door.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Almost anywhere one system calls another over a network: HTTP clients retrying a failed API call, a message
          queue redelivering a message its consumer failed to process, a mobile app retrying after a dropped
          connection. Most cloud SDKs (AWS, GCP, Azure) now build exponential backoff with jitter in by default,
          because so many early outages were made worse by naive retry logic.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Exponential backoff</strong> — roughly double the wait each attempt (1s, 2s, 4s, 8s&hellip;) so a struggling service gets breathing room instead of being hit at a constant rate.</li>
          <li>
            <strong>Jitter</strong> — randomize each delay so clients don&rsquo;t retry in lock-step. AWS&rsquo;s
            &ldquo;full jitter&rdquo; recommendation is{" "}
            <code>sleep = random(0, min(cap, base · 2^attempt))</code> — a <code>cap</code>{" "}keeps the maximum wait from
            growing forever as attempts pile up.
          </li>
          <li><strong>Cap attempts &amp; total time</strong> — give up eventually; retrying forever just moves the outage from the service to every one of its callers.</li>
          <li><strong>Only retry idempotent / retriable errors</strong> — never blindly retry a non-idempotent write (see <Link href="/concepts/idempotency" className="text-sky-400 hover:text-sky-300">Idempotency</Link>), and never retry a 4xx — the same bad request will fail the exact same way every time.</li>
          <li>Pair retries with a <Link href="/concepts/circuit-breaker" className="text-sky-400 hover:text-sky-300">circuit breaker</Link>{" "}so you stop hammering a dependency that&rsquo;s clearly down instead of retrying into the void.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Retries trade latency for reliability — a caller that eventually succeeds after 3 retries waited much longer than one that failed fast, so retries should have a sensible ceiling.</li>
          <li>Jitter smooths load, it doesn&rsquo;t eliminate it — if a dependency is down for a real, structural reason (not a brief blip), enough clients retrying will still add meaningful load even when spread out.</li>
          <li>Retrying only helps for transient failures. A retry budget (capping what fraction of traffic may be retries) protects the caller&rsquo;s own capacity when failures aren&rsquo;t transient.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Retrying a non-idempotent operation (like &ldquo;charge the card&rdquo;) without an idempotency key — a retried request can trigger the side effect twice.</li>
          <li>Retrying 4xx client errors — a malformed request or bad auth token will fail again no matter how many times you resend it.</li>
          <li>Exponential backoff with no jitter — attempts still land on a shared schedule, so the thundering herd survives even though the average wait went up.</li>
          <li>No cap on attempts or total elapsed time, so a single slow dependency can make a request hang indefinitely.</li>
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
