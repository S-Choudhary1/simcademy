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
            Beginner → Advanced
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Apache Kafka</h1>
        <p className="mt-2 text-slate-400">
          A distributed log built to handle huge volumes of events, where many independent consumers can each read
          the same stream at their own pace.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          Think of Kafka as one big, ordered logbook that many different systems can read from. Producers write
          (&ldquo;append&rdquo;) messages into named <strong>topics</strong>; consumers read those messages at
          whatever pace they can keep up with.
        </p>
        <p>
          The key difference from a normal queue: reading a message doesn&rsquo;t delete it. Kafka keeps every
          message around for a configured amount of time, and each consumer just remembers its own position in the
          log — called its <strong>offset</strong>. Because messages aren&rsquo;t removed on read, several completely
          different systems can all read the same stream, each at its own pace, each tracking its own place.
        </p>
      </Section>

      <Section id="problem" title="2. Why it exists">
        <p>
          If every service calls every other service directly, the number of connections explodes as you add more
          services — and each connection needs its own message format, retry logic, and plan for what happens when
          the other side can&rsquo;t keep up (<strong>backpressure</strong>).
        </p>
        <p>
          Kafka flips this around: a service publishes an event once, and any number of other services can subscribe
          to it independently, with no direct connection between them. This decouples producers from consumers in
          three ways: in <strong>time</strong>{" "}(a message waits in Kafka until a consumer is ready), in{" "}
          <strong>space</strong>{" "}(producer and consumer never talk to each other directly), and in{" "}
          <strong>rate</strong>{" "}(each consumer reads only as fast as it can).
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          Press <strong>Play</strong>. At the <strong>Beginner</strong>{" "}level one producer publishes into the broker
          and a single consumer drains it; switch to <strong>Intermediate</strong>{" "}for two consumers sharing the
          load, or <strong>Advanced</strong>{" "}for a full ingest-API-plus-three-consumers pipeline. Drag{" "}
          <strong>Traffic</strong>{" "}up past what the consumer(s) can process and watch the broker&rsquo;s{" "}
          <strong>Backlog (lag)</strong>{" "}climb in its Inspector panel. Select a consumer node and hit{" "}
          <strong>Kill</strong>{" "}in the Chaos panel to simulate it going down: the broker&rsquo;s remaining consume
          capacity drops, so the backlog grows faster and the survivor&rsquo;s utilisation rises to cover the gap.
        </p>
        <TechSimulator tech="kafka" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: partitions, offsets &amp; rebalancing</h3>
        <p>
          A closer look inside the broker. Every record the producer writes gets a partition and a steadily
          increasing <strong>offset</strong>{" "}within that partition. Each <strong>consumer group</strong>{" "}reads the
          whole topic independently and keeps its own offset per partition — add a second group, and it re-reads the
          same records from the start, completely separately from the first group.
        </p>
        <p>
          Inside one group, every partition is owned by exactly one consumer at a time. Add a consumer and Kafka
          triggers a <strong>rebalance</strong>, handing it some partitions and cutting everyone else&rsquo;s lag —
          but add more consumers than there are partitions, and the extras just sit idle with nothing to read. You
          can add a partition later to grow capacity, but you can&rsquo;t remove one — try it in the simulation to
          see why shrinking a topic isn&rsquo;t allowed.
        </p>
        <KafkaInternalsViz />
      </Section>

      <Section id="architecture" title="4. Architecture">
        <p>
          A <strong>topic</strong>{" "}is split into <strong>partitions</strong> — these are the units Kafka uses for both
          parallelism and ordering. Kafka only guarantees message order <em>within</em>{" "}a single partition, never
          across the whole topic. Each partition lives on a <strong>broker</strong>{" "}(one Kafka server); a cluster of
          brokers spreads partitions, and their replica copies, across machines. Inside a consumer group, each
          partition is handed to exactly one consumer — so once you have as many consumers as partitions, adding more
          consumers buys you no extra throughput; they just sit idle.
        </p>
      </Section>

      <Section id="lifecycle" title="5. Request Lifecycle">
        <p>
          <strong>Writing a message</strong>: the client turns the message&rsquo;s key into a partition number (so the
          same key always lands on the same partition), batches up several records, and sends them to that
          partition&rsquo;s leader broker. The leader appends them to its log and, if you&rsquo;ve set{" "}
          <code>acks=all</code>, waits until every in-sync replica has a copy before confirming the write.
        </p>
        <p>
          <strong>Reading a message</strong>: a consumer fetches new records from whichever partitions it owns,
          starting right after its last committed offset. It processes the batch, then commits the new offset so it
          won&rsquo;t re-read the same records next time.
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
            <code>__consumer_offsets</code>{" "}topic.
          </li>
        </ul>
      </Section>

      <Section id="scaling" title="7. Scaling">
        <p>
          To scale throughput, add partitions and consumers together — up to one consumer per partition, since
          that&rsquo;s the hard limit on parallelism within a group. To scale durability and availability, add more
          brokers and more replicas instead. The limit you&rsquo;ll hit in the simulation is intentional: with 3
          partitions, a 4th consumer in the group never helps, no matter how fast it is.
        </p>
      </Section>

      <Section id="failure" title="8. Failure Scenarios">
        <p>
          In the partition demo above, click <strong>− consumer</strong>{" "}on a group with more than one member: its
          partitions get handed to the survivors — a <strong>rebalance</strong>. Each survivor now owns more
          partitions, so its share of the throughput drops and lag climbs. In production, a rebalance can also
          briefly pause the whole group while membership is re-coordinated (newer cooperative rebalancing strategies
          shrink this pause, but don&rsquo;t remove it entirely). If a broker itself fails, one of its in-sync
          replicas is promoted to take over as leader.
        </p>
      </Section>

      <Section id="metrics" title="9. Metrics">
        <p>
          The one number to watch is <strong>consumer lag</strong>: the latest offset produced minus the offset your
          consumer has committed. If lag keeps climbing instead of staying flat, your consumers can&rsquo;t keep up —
          that&rsquo;s your signal to add more consumers or partitions, or speed up processing. This behaves like any
          queue: once messages arrive faster than you can process them, the backlog grows with no natural limit
          (this is Little&rsquo;s Law in action).
        </p>
      </Section>

      <Section id="tradeoffs" title="10. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Order is only guaranteed within one partition — strict ordering across everything means a single partition, and no parallelism.</li>
          <li>Being able to replay history is powerful, but it isn&rsquo;t free — retained messages cost disk space.</li>
          <li>Running Kafka is more operational work than running a simple queue, and it&rsquo;s overkill for low-volume, request/response-style traffic.</li>
        </ul>
      </Section>

      <Section id="comparisons" title="11. Comparisons">
        <p>
          See{" "}
          <Link href="/comparisons/kafka-vs-rabbitmq" className="text-sky-400 hover:text-sky-300">
            Kafka vs RabbitMQ
          </Link>
          : Kafka is a replayable log optimised for throughput; RabbitMQ is a smart broker optimised for flexible
          routing and per-message acknowledgement.
        </p>
      </Section>

      <Section id="usage" title="12. Real-world Usage">
        <p>
          Common uses: event sourcing, activity/clickstream tracking, log and metrics pipelines, stream processing
          (with tools like Kafka Streams or Flink), and as the backbone connecting microservices. LinkedIn built
          Kafka originally, and it now runs at massive scale at Netflix, Uber, and most large streaming platforms.
        </p>
      </Section>

      <Section id="related" title="13. Related Concepts">
        <p className="flex flex-wrap gap-2">
          <Link href="/concepts/consistent-hashing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Consistent Hashing</Link>
          <Link href="/concepts/cap" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CAP</Link>
          <Link href="/concepts/idempotency" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Idempotency</Link>
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300">Backpressure</span>
          <Link href="/concepts/replication" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Replication</Link>
        </p>
      </Section>

      <Section id="interview" title="14. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Why can you not have more useful consumers than partitions in a group?</li>
          <li>How does Kafka guarantee ordering, and what is its scope?</li>
          <li>What exactly is consumer lag, and how would you fix sustained lag?</li>
          <li>Explain <code>acks=0/1/all</code>{" "}and the durability vs latency trade-off.</li>
        </ol>
      </Section>

      <Section id="how-to-use" title="How to use it">
        <p>Size the topic, then produce with a key and consume in a group:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`# create a topic — partitions cap consumer parallelism, RF = durability
kafka-topics --create --topic events --partitions 6 --replication-factor 3 \\
  --bootstrap-server localhost:9092

// producer: key picks the partition (per-key ordering); acks=all for durability
await producer.send({ topic: "events", key: userId, value: JSON.stringify(order), acks: "all" })

// consumer group "billing": members split partitions, commit after processing
consumer.subscribe(["events"])          // groupId: "billing"
for (const msg of await consumer.poll()) handle(msg)
await consumer.commit()`}
        </pre>
        <p>
          The snippet above shows the <em>shape</em>{" "}of the operations, not one specific library&rsquo;s exact method
          names — those differ a bit across clients (kafkajs, the Confluent clients, the Java client, etc.), so check
          your client&rsquo;s docs for the literal API.
        </p>
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
