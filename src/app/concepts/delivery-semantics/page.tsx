import Link from "next/link";
import type { Metadata } from "next";
import { DeliverySemanticsViz } from "@/concepts/DeliverySemanticsViz";
import { TopicMeme } from "@/components/memes";

export const metadata: Metadata = {
  title: "Delivery Semantics — Interactive Concept",
  description:
    "At-most-once, at-least-once, and exactly-once message delivery visualized over an unreliable network. Why a lost ack causes duplicates, why a lost message causes loss, and how dedup on a message id gives exactly-once effects.",
  keywords: ["delivery semantics", "at-least-once", "at-most-once", "exactly-once", "message queue", "idempotent consumer", "dedup", "acknowledgement", "Kafka", "message loss", "duplicate delivery"],
  alternates: { canonical: "/concepts/delivery-semantics" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function DeliverySemanticsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Concepts</span> / <span className="text-slate-300">Delivery Semantics</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300">Concept</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Delivery Semantics</h1>
        <p className="mt-2 text-slate-400">
          Networks drop messages and acknowledgements. What you do about that decides whether a message can be lost,
          processed twice, or take effect exactly once.
        </p>
      </header>

      <Section title="The three guarantees">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>At-most-once</strong> — send and forget. No retry, so nothing is duplicated, but a dropped message is lost.</li>
          <li><strong>At-least-once</strong> — retry until acknowledged. Nothing is lost, but a lost ack causes a resend and the consumer processes it twice.</li>
          <li><strong>Exactly-once</strong> — at-least-once delivery plus <strong>deduplication</strong> on a message id, so a resend has no extra effect.</li>
        </ul>
      </Section>

      <Section title="Try it">
        <p>
          Choose a guarantee and a failure — a <strong>lost ack</strong> (the classic duplicate trigger) or a{" "}
          <strong>lost message</strong> (the classic loss trigger) — then run it and watch the <em>effect count</em>:
          how many times the message actually took effect.
        </p>
        <DeliverySemanticsViz />
      </Section>

      <Section title="Exactly-once is really at-least-once + idempotency">
        <p>
          True end-to-end &ldquo;exactly-once processing&rdquo; is hard: the network can always duplicate. What systems
          actually do is deliver <em>at least once</em> and make the consumer <strong>idempotent</strong> — dedup on a
          message id, or design the operation so applying it twice equals applying it once. Kafka&rsquo;s
          &ldquo;exactly-once&rdquo; uses idempotent producers plus transactions to achieve this within its boundary.
        </p>
      </Section>

      <div className="mt-8"><TopicMeme topic="delivery-semantics" /></div>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/idempotency" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Idempotency</Link>
          <Link href="/concepts/outbox" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Transactional Outbox</Link>
          <Link href="/technologies/kafka" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Kafka</Link>
        </p>
      </Section>
    </main>
  );
}
