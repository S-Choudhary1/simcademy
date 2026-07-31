import Link from "next/link";
import type { Metadata } from "next";
import { TechSimulator } from "@/sim/ui/TechSimulator";
import { KafkaInternalsViz } from "@/concepts/KafkaInternalsViz";

export const metadata: Metadata = {
  title: "Apache Kafka — Interactive Simulation",
  description:
    "Explore how Apache Kafka works: partitions, consumer groups, offsets, and consumer lag. Interactive, browser-based simulation — change the produce rate, kill a consumer, and watch lag build in real time.",
  keywords: [
    "Apache Kafka",
    "Kafka partitions",
    "consumer group",
    "consumer lag",
    "Kafka tutorial",
    "distributed messaging",
  ],
  alternates: { canonical: "/technologies/kafka" },
  openGraph: {
    title: "Apache Kafka — Interactive Simulation",
    description:
      "Change the produce rate, kill a consumer, and watch consumer lag build in real time.",
    type: "article",
  },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-800 py-8 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function KafkaPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Technologies</span> /{" "}
        <span className="text-slate-300">Kafka</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">
            Technology
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            Intermediate
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Apache Kafka</h1>
        <p className="mt-2 text-slate-400">
          A distributed, partitioned, append-only commit log for high-throughput event streaming.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          Kafka is a distributed commit log. Producers <em>append</em> messages to named{" "}
          <strong>topics</strong>; consumers <em>read</em> them at their own pace. Unlike a
          traditional queue, Kafka does not delete a message when it is read — messages are retained
          for a configured time, and each consumer tracks its own position (offset). That single
          design choice is what lets many independent systems replay the same stream.
        </p>
      </Section>

      <Section id="problem" title="2. Why it exists">
        <p>
          Point-to-point integrations between N services grow as N² connections, each with its own
          format, retry logic, and backpressure story. Kafka inverts this: services publish events
          once, and any number of consumers subscribe independently. It decouples producers from
          consumers in <strong>time</strong> (retention), <strong>space</strong> (no direct
          connection), and <strong>rate</strong> (consumers read as fast as they can).
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          Press <strong>Play</strong>. The producer appends to three partitions; two consumers in a
          group split those partitions and commit offsets as they process. Raise the{" "}
          <strong>produce rate</strong> above what the consumers can handle, or click{" "}
          <strong>Kill a consumer</strong>, and watch total lag climb — the amber portion of each
          partition bar is the backlog waiting to be consumed.
        </p>
        <TechSimulator tech="kafka" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: partitions, offsets &amp; rebalancing</h3>
        <p>
          A closer look inside the broker. The producer appends records to partition logs, each getting a monotonic
          <strong> offset</strong>. Every <strong>consumer group</strong> reads the whole topic and tracks its{" "}
          <em>own</em> committed offset per partition, so add a second group and it re-reads the same records
          independently. Within a group, each partition is owned by exactly one consumer — add consumers to trigger a{" "}
          <strong>rebalance</strong> and cut lag, but go past the partition count and the extra consumer sits idle. Add
          a partition to grow capacity; try to remove one to see why Kafka can&rsquo;t shrink a topic in place.
        </p>
        <KafkaInternalsViz />
      </Section>

      <Section id="architecture" title="4. Architecture">
        <p>
          A <strong>topic</strong> is divided into <strong>partitions</strong> — the unit of
          parallelism and ordering. Order is guaranteed only <em>within</em> a partition. A{" "}
          <strong>broker</strong> hosts partitions; a cluster spreads partitions (and their
          replicas) across brokers. A <strong>consumer group</strong> assigns each partition to
          exactly one consumer in the group, so adding consumers beyond the partition count buys no
          extra throughput — the extras sit idle.
        </p>
      </Section>

      <Section id="lifecycle" title="5. Request Lifecycle">
        <p>
          Produce: the client hashes the record key to pick a partition, batches records, and sends
          them to the partition leader, which appends to its log and (with{" "}
          <code>acks=all</code>) waits for in-sync replicas before acknowledging. Consume: a
          consumer fetches from its assigned partitions starting at its committed offset, processes
          the batch, then commits the new offset.
        </p>
      </Section>

      <Section id="components" title="6. Internal Components">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Log segments</strong> — the append-only file backing each partition, split into
            segments for retention and compaction.
          </li>
          <li>
            <strong>Partition leader &amp; replicas (ISR)</strong> — one leader handles reads/writes;
            in-sync replicas follow for durability.
          </li>
          <li>
            <strong>Offsets</strong> — a per-partition, per-group cursor stored in the internal{" "}
            <code>__consumer_offsets</code> topic.
          </li>
        </ul>
      </Section>

      <Section id="scaling" title="7. Scaling">
        <p>
          Scale throughput by adding partitions and consumers together (up to one consumer per
          partition). Scale durability and availability by adding brokers and replicas. The hard
          limit in the simulation is deliberate: with 3 partitions, a 4th consumer never helps.
        </p>
      </Section>

      <Section id="failure" title="8. Failure Scenarios">
        <p>
          Kill a consumer in the simulation. Its partitions are reassigned to the survivors (a{" "}
          <strong>rebalance</strong>); each survivor now owns more partitions, per-partition
          throughput falls, and lag grows. In production the same event also causes a brief
          stop-the-world pause while the group re-coordinates. Broker failure promotes an in-sync
          replica to leader.
        </p>
      </Section>

      <Section id="metrics" title="9. Metrics">
        <p>
          The number that matters is <strong>consumer lag</strong> = latest produced offset −
          committed offset. Sustained, growing lag means consumers cannot keep up and is the signal
          to add consumers/partitions or speed up processing. Watch how lag behaves as a queue: when
          arrival rate exceeds service rate, backlog grows without bound (Little&rsquo;s Law).
        </p>
      </Section>

      <Section id="tradeoffs" title="10. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Ordering only within a partition — global ordering requires a single partition.</li>
          <li>Retention costs disk; replay power costs storage.</li>
          <li>Operationally heavier than a simple queue; wrong for low-volume RPC-style work.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="11. Comparisons">
        <p>
          See <span className="text-slate-400">Kafka vs RabbitMQ</span> (coming soon): Kafka is a
          replayable log optimised for throughput; RabbitMQ is a smart broker optimised for flexible
          routing and per-message acknowledgement.
        </p>
      </Section>

      <Section id="usage" title="12. Real-world Usage">
        <p>
          Event sourcing, activity streams, log/metric pipelines, stream processing (Kafka Streams,
          Flink), and as the backbone between microservices. Used at scale by LinkedIn (its
          birthplace), Netflix, Uber, and most large streaming platforms.
        </p>
      </Section>

      <Section id="related" title="13. Related Concepts">
        <p className="flex flex-wrap gap-2">
          {["Consistent Hashing", "CAP", "Idempotency", "Backpressure", "Replication"].map((c) => (
            <span key={c} className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">
              {c}
            </span>
          ))}
        </p>
      </Section>

      <Section id="interview" title="14. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Why can you not have more useful consumers than partitions in a group?</li>
          <li>How does Kafka guarantee ordering, and what is its scope?</li>
          <li>What exactly is consumer lag, and how would you fix sustained lag?</li>
          <li>Explain <code>acks=0/1/all</code> and the durability vs latency trade-off.</li>
        </ol>
      </Section>

      <Section id="usage" title="How to use it">
        <p>Size the topic, then produce with a key and consume in a group:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`# create a topic — partitions cap consumer parallelism, RF = durability
kafka-topics --create --topic events --partitions 6 --replication-factor 3

// producer: key picks the partition (per-key ordering); acks=all for durability
await producer.send({ topic: "events", key: userId, value: JSON.stringify(order), acks: "all" })

// consumer group "billing": members split partitions, commit after processing
consumer.subscribe(["events"])          // groupId: "billing"
for (const msg of await consumer.poll()) handle(msg)
await consumer.commit()`}
        </pre>
        <p>
          Key decisions: partition count (parallelism ceiling), the message key (ordering scope), <code>acks</code>{" "}
          (0/1/all — latency vs durability), and retention.
        </p>
      </Section>

      <Section id="references" title="15. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>Apache Kafka documentation — kafka.apache.org/documentation</li>
          <li>Kreps, Narkhede, Rao — “Kafka: a Distributed Messaging System for Log Processing”</li>
        </ul>
      </Section>
    </main>
  );
}
