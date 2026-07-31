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
          Command Query Responsibility Segregation — separate the write model from the read model.
        </p>
      </header>

      <Section title="Definition">
        <p>
          CQRS splits a system into a <strong>write model</strong> that handles commands (state changes) and a{" "}
          <strong>read model</strong> that serves queries. The write model emits events; a <strong>projection</strong>{" "}
          consumes them to build the read model — often a denormalised shape optimised purely for reading.
        </p>
      </Section>

      <Section title="The problem it solves">
        <p>
          One model rarely serves both sides well: writes want normalised, validated, transactional structures; reads
          want wide, pre-joined, fast-to-query shapes. Splitting them lets each scale and be modelled independently —
          at the cost of keeping the read model in sync.
        </p>
      </Section>

      <Section title="Try it">
        <p>
          Send commands and watch the write model advance immediately, while the read model catches up only after the
          projection runs. Fire several quickly, then query — the read model reports an older version until it
          converges (eventual consistency <em>between the models</em>).
        </p>
        <CqrsViz />
      </Section>

      <Section title="Analogy">
        <p>
          A newspaper. The newsroom (write model) edits and files stories; the printed edition (read model) is a
          separate, read-optimised projection produced from them. Readers never edit the printed paper, and today&rsquo;s
          edition may lag the very latest newsroom change.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          High-read systems, dashboards, and anywhere reads and writes have very different shapes or scale. It pairs
          naturally with <strong>event sourcing</strong> (the event log is the source of truth) and reliable event
          delivery via the <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link>.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Split the code into command handlers (validate + mutate the write model) and query handlers (read the read model).</li>
          <li>On every write, emit a domain event; a <strong>projection</strong> subscribes and updates the read store in the shape queries want.</li>
          <li>Publish those events reliably with the <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">outbox</Link>, and keep the ability to rebuild the read model by replaying events.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Independent scaling and read-optimized shapes vs more moving parts and eventual consistency between the two models.</li>
          <li>Read-after-write shows stale data until the projection catches up — plan the UX for it.</li>
          <li>Worth it for high-scale or complex-read domains; overkill for plain CRUD.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Applying CQRS everywhere — most CRUD doesn&rsquo;t need it, and the split adds real complexity.</li>
          <li>Ignoring the lag: UIs that read-after-write from the read model show stale data.</li>
          <li>No way to rebuild the read model if a projection has a bug.</li>
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
