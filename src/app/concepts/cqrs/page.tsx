import Link from "next/link";
import type { Metadata } from "next";
import { CqrsViz } from "@/concepts/CqrsViz";

export const metadata: Metadata = {
  title: "CQRS — Interactive Concept",
  description:
    "CQRS (Command Query Responsibility Segregation) explained with an interactive simulation: commands update a write model that projects into a separate read model, with eventual consistency between them.",
  keywords: ["CQRS", "command query separation", "read model", "write model", "projection", "event sourcing"],
  alternates: { canonical: "/concepts/cqrs" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function CqrsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">CQRS</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">CQRS</h1>
        <p className="mt-2 text-slate-400">
          Command Query Responsibility Segregation — use a different model for writing data than for reading it.
        </p>
      </header>

      <Section title="Definition">
        <p>
          CQRS means using two separate models instead of one: a <strong>write model</strong> that handles{" "}
          <strong>commands</strong> (anything that changes data) and a <strong>read model</strong> that handles{" "}
          <strong>queries</strong> (anything that just reads data).
        </p>
        <p>
          In its simplest form, both models can even share the same database — CQRS by itself just means
          &ldquo;stop reusing one model for both jobs.&rdquo; Most real-world CQRS systems go further: the write
          model emits events, and a background process called a <strong>projection</strong> listens for those events
          and builds a read-optimised copy of the data, often reshaped and flattened purely for fast queries. That
          version is more powerful, but it adds a short delay between writing and the read model catching up.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          One data model is rarely great at both jobs. Writes want a normalised, validated structure that protects
          data integrity. Reads want a wide, pre-joined shape that&rsquo;s fast to query, often sliced in several
          different ways. Forcing one model to do both usually means compromising on one side. Splitting them lets
          each be designed — and scaled — for what it&rsquo;s actually good at.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Send a few commands and watch the write model update immediately. The read model doesn&rsquo;t change yet
          — it only updates once the projection has processed the new events. Fire several commands quickly, then
          query right away: the read model will report an older version until the projection catches up. That short
          delay is what &ldquo;eventual consistency between the models&rdquo; means here — no data is lost, the read
          side just needs a moment to catch up.
        </p>
        <CqrsViz />
      </Section>

      <Section title="Analogy">
        <p>
          A newspaper. The newsroom (write model) edits and files stories as they happen; the printed edition (read
          model) is a separate, read-optimised snapshot produced from them. Readers never edit the printed paper
          directly, and today&rsquo;s edition can lag a few minutes behind the very latest newsroom change.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Dashboards, feeds, and any system where reads vastly outnumber writes or need a very different shape than
          the write side. It&rsquo;s often paired with <strong>event sourcing</strong> (where the event log itself is
          the source of truth) and delivered reliably with the{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link> pattern.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Split your code into command handlers (validate the request, then change the write model) and query handlers (just read from the read model) — they don&rsquo;t need to share logic.</li>
          <li>When the write model changes, emit a domain event describing what happened. A <strong>projection</strong> listens for that event and updates the read store into whatever shape the queries need.</li>
          <li>Publish those events reliably with the <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link> pattern, and keep the event history so you can rebuild the read model from scratch if a projection ever has a bug.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Independently scalable, read-optimised models vs more moving parts and a read model that can briefly lag behind the write model.</li>
          <li>A user who writes something and immediately re-reads it from the read model may not see their own change yet — design the UI around that instead of assuming an instant round-trip.</li>
          <li>Worth the complexity for high-scale or complex-read systems; for a simple, low-traffic CRUD app, one shared model is usually simpler and perfectly fine.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Adding CQRS to a plain CRUD app that doesn&rsquo;t need it — most apps are fine with one model, and the split is real, ongoing complexity.</li>
          <li>Forgetting the lag — showing stale data right after a write will confuse users if the UX doesn&rsquo;t account for it.</li>
          <li>No way to rebuild the read model from events — if a projection bug corrupts the read store, you need to replay history, not hand-patch bad data.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/base" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">BASE</Link>
          <Link href="/concepts/outbox" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Transactional Outbox</Link>
          <Link href="/concepts/saga" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Saga</Link>
        </p>
      </Section>
    </main>
  );
}
