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
          Networks drop messages and the acknowledgements that confirm they arrived. What you do about that decides
          whether a message gets lost, processed twice, or takes effect exactly once.
        </p>
      </header>

      <Section title="The three guarantees">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>At-most-once</strong> — the sender fires off the message once and never retries. Nothing is ever duplicated, but a message that gets dropped along the way is gone for good.</li>
          <li><strong>At-least-once</strong> — the sender keeps retrying until it gets an acknowledgement (a confirmation the message arrived). Nothing is ever lost — but if that confirmation gets lost instead, the sender resends a message that already arrived, and it gets processed twice.</li>
          <li><strong>Exactly-once</strong> — in practice, this means at-least-once delivery plus <strong>deduplication</strong>: the receiver remembers which message IDs it has already handled and ignores repeats, so a duplicate has no extra effect.</li>
        </ul>
      </Section>

      <Section title="Try it">
        <p>
          Pick a guarantee and a failure to inject — a <strong>lost ack</strong> (the classic cause of duplicates) or
          a <strong>lost message</strong> (the classic cause of loss) — then run it and watch the <em>effect count</em>:
          how many times the message actually changed something.
        </p>
        <DeliverySemanticsViz />
      </Section>

      <Section title="Analogy">
        <p>
          Mailing a letter. <strong>At-most-once</strong> is dropping it in a mailbox and never checking — if it&rsquo;s
          lost, you&rsquo;ll never know. <strong>At-least-once</strong> is mailing copy after copy until you get a
          signed receipt back — but if the receipt itself gets lost in the mail (not the letter), you&rsquo;ll send
          one more copy than you needed to, and the recipient ends up with two letters. <strong>Exactly-once</strong>,
          in practice, means the recipient keeps a logbook of letter IDs and throws away any letter they&rsquo;ve
          already logged — so two copies arriving still only counts once.
        </p>
      </Section>

      <Section title="Exactly-once is really at-least-once + idempotency">
        <p>
          True end-to-end &ldquo;exactly-once delivery&rdquo; is effectively impossible: the network can always
          duplicate a message somewhere along the way. What real systems do instead is deliver <em>at least once</em>{" "}
          and make the consumer <strong>idempotent</strong> — dedup on a message id, or design the operation so
          applying it twice has the same effect as applying it once. Kafka&rsquo;s &ldquo;exactly-once&rdquo; mode
          uses an idempotent producer plus transactions to achieve this within its own boundary (Kafka to Kafka) —
          it doesn&rsquo;t automatically make side effects outside Kafka exactly-once too.
        </p>
      </Section>

      <Section title="Where it&rsquo;s used">
        <p>
          Kafka consumer offset commits, RabbitMQ&rsquo;s ack/nack, Amazon SQS (which documents itself as
          at-least-once), and payment webhooks — Stripe, for example, retries a webhook delivery on a schedule and
          explicitly tells you to make your handler idempotent.
        </p>
      </Section>

      <Section title="How to implement">
        <ul className="list-disc space-y-1 pl-5">
          <li>Pick the guarantee based on what a duplicate or a loss actually costs you: a page-view counter can tolerate occasional loss (at-most-once); a payment or an order can&rsquo;t (needs at-least-once).</li>
          <li>To get at-least-once with a queue or broker, acknowledge (or commit the offset for) a message only <em>after</em> you&rsquo;ve finished processing it, not before — if you crash in between, the broker redelivers it.</li>
          <li>To get the practical effect of exactly-once, pair at-least-once delivery with a dedup step in the consumer — see <Link href="/concepts/idempotency" className="text-sky-400 hover:text-sky-300">Idempotency</Link> and <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">Transactional Outbox</Link> for the actual mechanics.</li>
        </ul>
      </Section>

      <Section title="Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>At-most-once is the simplest and cheapest — fire and forget — but only safe when occasional silent loss is acceptable.</li>
          <li>At-least-once needs retry logic on the sender, and every consumer must be written to tolerate duplicates — that&rsquo;s a requirement, not an edge case.</li>
          <li>Dedup-based &ldquo;exactly-once&rdquo; only covers what your consumer does directly. If your handler calls out to another system that isn&rsquo;t itself idempotent, a duplicate can still cause a double effect there.</li>
        </ul>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">
          <li>Acknowledging a message before finishing the work — crash right after acking but before the side effect runs, and you&rsquo;ve silently turned an at-least-once queue into an at-most-once one for that message.</li>
          <li>Assuming your broker&rsquo;s &ldquo;exactly-once&rdquo; setting makes your whole pipeline exactly-once — the guarantee usually stops at the broker boundary; anything your handler does beyond it (call another API, send an email) still needs its own idempotency.</li>
          <li>Treating &ldquo;exactly-once delivery&rdquo; (practically unachievable over a real network) and &ldquo;exactly-once processing effects&rdquo; (achievable via dedup) as the same claim.</li>
        </ul>
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
