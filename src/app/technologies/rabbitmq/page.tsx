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
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">Intermediate</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">RabbitMQ</h1>
        <p className="mt-2 text-slate-400">
          A message broker for work queues and flexible routing — decouple producers from consumers.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          RabbitMQ is a smart broker: producers publish messages to an <strong>exchange</strong>, which routes them into{" "}
          <strong>queues</strong>, where <strong>consumers</strong> pick them up. Unlike Kafka&rsquo;s replayable log,
          RabbitMQ is optimised for per-message delivery, acknowledgements, and rich routing.
        </p>
      </Section>

      <Section id="why" title="2. Why it exists">
        <p>
          It lets a fast producer hand off work without waiting for it to finish. Consumers process at their own pace;
          if they fall behind, the queue absorbs the burst — the queue depth <em>is</em> the backlog.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          <strong>Beginner</strong> is a single work queue (watch the backlog grow). <strong>Intermediate</strong> adds
          competing consumers that share the load. <strong>Advanced</strong> shows an exchange routing to two separate
          queues with their own workers.
        </p>
        <TechSimulator tech="rabbitmq" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: acks &amp; dead-letter queue</h3>
        <p>
          What happens when a consumer can&rsquo;t process a message. With the consumer failing, each message is nacked
          and retried a few times, then routed to the dead-letter queue so a &ldquo;poison message&rdquo; can&rsquo;t
          block the queue forever. Flip the consumer healthy to drain the rest via acks.
        </p>
        <RabbitDeadLetterViz />
      </Section>

      <Section id="scaling" title="4. Scaling">
        <p>
          Scale throughput by adding consumers to a queue (competing-consumers pattern). Because any consumer can take
          any message, N consumers give roughly N× drain rate — until the broker or downstream becomes the limit.
        </p>
      </Section>

      <Section id="failure" title="5. Failure Scenarios">
        <p>
          Kill a consumer and its share of work redistributes to the survivors, so the backlog climbs. If producers
          persistently outrun consumers, the queue grows unbounded until it hits its limit and rejects new messages
          (backpressure).
        </p>
      </Section>

      <Section id="metrics" title="6. Metrics">
        <p>
          Queue <strong>backlog</strong> (lag) is the number to watch, alongside consumer utilisation. Sustained,
          growing backlog means you need more consumers or faster processing.
        </p>
      </Section>

      <Section id="tradeoffs" title="7. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Rich routing and per-message acks vs. Kafka&rsquo;s raw throughput and replay.</li>
          <li>Messages are typically consumed once and gone — not replayable like a log.</li>
          <li>Very deep queues signal a consumer-scaling problem, not a solution.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="8. Comparisons">
        <p>
          See <span className="text-slate-400">Kafka vs RabbitMQ</span> (coming soon): replayable log for throughput vs.
          smart broker for flexible routing and acknowledgements.
        </p>
      </Section>

      <Section id="usage" title="9. Real-world Usage">
        <p>Background jobs, task distribution, RPC-style work, and event routing between microservices.</p>
      </Section>

      <Section id="interview" title="10. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>How do competing consumers scale a work queue?</li>
          <li>When would you choose RabbitMQ over Kafka?</li>
          <li>What happens when producers persistently outrun consumers?</li>
        </ol>
      </Section>

      <Section id="usage" title="How to use it">
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
        <p>Add publisher confirms for reliable sends, and a dead-letter exchange for poison messages.</p>
      </Section>

      <Section id="references" title="11. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>RabbitMQ documentation — Work Queues &amp; Exchanges</li>
          <li>AMQP 0-9-1 model</li>
        </ul>
      </Section>
    </main>
  );
}
