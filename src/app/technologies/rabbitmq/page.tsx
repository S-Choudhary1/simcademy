import Link from "next/link";
import type { Metadata } from "next";
import { TechSimulator } from "@/sim/ui/TechSimulator";
import { RabbitDeadLetterViz } from "@/concepts/RabbitDeadLetterViz";

export const metadata: Metadata = {
  title: "RabbitMQ — Interactive Simulation",
  description:
    "Explore how RabbitMQ works: work queues, competing consumers, exchanges, and routing. Interactive, browser-based simulation with live backlog.",
  keywords: ["RabbitMQ", "message queue", "work queue", "competing consumers", "exchange", "AMQP"],
  alternates: { canonical: "/technologies/rabbitmq" },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-800 py-8 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function RabbitMQPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Technologies</span> / <span className="text-slate-300">RabbitMQ</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">Technology</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">Beginner → Advanced</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">RabbitMQ</h1>
        <p className="mt-2 text-slate-400">
          A message broker for work queues and flexible routing — decouple producers from consumers.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          RabbitMQ is a &ldquo;smart broker&rdquo; sitting between producers and consumers. Producers publish messages
          to an <strong>exchange</strong>, which routes each one into one or more <strong>queues</strong>, where{" "}
          <strong>consumers</strong> pick them up. Unlike Kafka&rsquo;s replayable log, RabbitMQ is built for
          per-message delivery, acknowledgements, and flexible routing rules — not for replaying old history.
        </p>
      </Section>

      <Section id="why" title="2. Why it exists">
        <p>
          It lets a fast producer hand off work without waiting for it to finish. The producer just drops a message
          in a queue and moves on. Consumers process messages at their own pace, and if they fall behind, the queue
          simply holds the backlog — the queue&rsquo;s length <em>is</em> the backlog.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          <strong>Beginner</strong> is a single work queue — watch the backlog grow when producers outpace the
          consumer. <strong>Intermediate</strong> adds competing consumers that share the load between them.{" "}
          <strong>Advanced</strong> shows an exchange routing messages to two separate queues, each with its own
          workers.
        </p>
        <TechSimulator tech="rabbitmq" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: acks &amp; dead-letter queue</h3>
        <p>
          What happens when a consumer can&rsquo;t process a message? With the consumer set to fail, each message is{" "}
          <strong>nacked</strong> (negatively acknowledged) and retried. Once it&rsquo;s been retried the configured
          number of times, it gets routed to a <strong>dead-letter queue</strong> instead — this keeps one
          &ldquo;poison message&rdquo; from blocking the whole queue forever. Flip the consumer back to healthy to
          drain the rest normally, with each success sending a plain <strong>ack</strong>.
        </p>
        <RabbitDeadLetterViz />
      </Section>

      <Section id="scaling" title="4. Scaling">
        <p>
          Scale throughput by adding more consumers to a queue — this is the <strong>competing consumers</strong>{" "}
          pattern. Because any consumer can pick up any message, N consumers give you roughly N× the drain rate,
          until something else (the broker, or whatever&rsquo;s downstream) becomes the bottleneck.
        </p>
      </Section>

      <Section id="failure" title="5. Failure Scenarios">
        <p>
          Kill a consumer and its share of the work redistributes to the survivors, so the backlog climbs. If
          producers consistently outpace consumers, the queue keeps growing until it hits its configured limit and
          starts rejecting new messages — this push-back is called <strong>backpressure</strong>.
        </p>
      </Section>

      <Section id="metrics" title="6. Metrics">
        <p>
          <strong>Queue backlog</strong> (how many messages are waiting) is the number to watch, alongside how busy
          your consumers are. If the backlog keeps growing instead of staying flat, you need more consumers or faster
          processing.
        </p>
      </Section>

      <Section id="tradeoffs" title="7. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Rich routing and per-message acknowledgements vs. Kafka&rsquo;s raw throughput and ability to replay history.</li>
          <li>A message is typically consumed once and then gone — it&rsquo;s not a replayable log like Kafka.</li>
          <li>A very deep, ever-growing queue is a sign you need more consumers, not a workaround for not having enough.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="8. Comparisons">
        <p>
          See{" "}
          <Link href="/comparisons/kafka-vs-rabbitmq" className="text-sky-400 hover:text-sky-300">
            Kafka vs RabbitMQ
          </Link>
          : a replayable log built for throughput vs. a smart broker built for flexible routing and
          acknowledgements.
        </p>
      </Section>

      <Section id="usage" title="9. Real-world Usage">
        <p>Background jobs, task distribution, RPC-style request/response work, and event routing between microservices.</p>
      </Section>

      <Section id="related" title="10. Related Concepts">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/idempotency" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Idempotency</Link>
          <Link href="/concepts/delivery-semantics" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Delivery Semantics</Link>
          <Link href="/concepts/outbox" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Transactional Outbox</Link>
          <Link href="/concepts/retries-backoff" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Retries &amp; Backoff</Link>
        </p>
      </Section>

      <Section id="interview" title="11. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>How do competing consumers scale a work queue?</li>
          <li>When would you choose RabbitMQ over Kafka?</li>
          <li>What happens when producers persistently outrun consumers?</li>
        </ol>
      </Section>

      <Section id="how-to-use" title="How to use it">
        <p>Declare a durable topology and consume reliably with acks and prefetch:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`await ch.assertExchange("orders", "direct", { durable: true })
await ch.assertQueue("orders.process", { durable: true })
await ch.bindQueue("orders.process", "orders", "created")

ch.prefetch(10)                          // don't hoard unacked messages
ch.consume("orders.process", (msg) => {
  work(msg)
  ch.ack(msg)                            // ack only after success
})`}
        </pre>
        <p>Add publisher confirms for reliable sends, and a dead-letter exchange so poison messages don&rsquo;t block the queue.</p>
      </Section>

      <Section id="references" title="12. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>RabbitMQ documentation — Work Queues &amp; Exchanges</li>
          <li>AMQP 0-9-1 model</li>
        </ul>
      </Section>
    </main>
  );
}
