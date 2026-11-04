import type { Metadata } from "next";
import { ComparisonSim } from "@/sim/ui/ComparisonSim";
import { TECH_BLUEPRINTS } from "@/sim/blueprints";
import { Article, Breadcrumb, Kicker, Title, Dek, Meta, Versus, Lede, H2, P, Callout, PullQuote, Figure, CompareTable, ChooseWhen, Related, A } from "@/components/article";

export const metadata: Metadata = {
  title: "Kafka vs RabbitMQ — Comparison",
  description:
    "Kafka vs RabbitMQ compared: a replayable log versus a smart routing broker. Throughput, replay, ordering, routing, scaling, and failure behavior — with a live side-by-side simulation and a decision guide.",
  keywords: ["Kafka vs RabbitMQ", "message queue", "event streaming", "broker comparison", "AMQP", "log vs queue"],
  alternates: { canonical: "/comparisons/kafka-vs-rabbitmq" },
};

export default function KafkaVsRabbitMqPage() {
  return (
    <Article>
      <Breadcrumb section="Comparisons" sectionHref="/comparisons" title="Kafka vs RabbitMQ" />
      <Kicker>Comparison · Messaging</Kicker>
      <Title>Kafka vs RabbitMQ</Title>
      <Dek>Two ways to move messages between services: a replayable log you rewind, versus a smart broker that routes and forgets.</Dek>
      <Meta read="7 min read" tag="Messaging" />

      <Versus
        sides={[
          { name: "Apache Kafka", tag: "A distributed append-only log; consumers replay at their own offset.", color: "#38bdf8", icon: "🪵" },
          { name: "RabbitMQ", tag: "A smart broker; an exchange routes to queues, consumers ack and it's gone.", color: "#fb923c", icon: "🐰" },
        ]}
      />

      <Lede>
        Both sit between the thing sending a message and the thing receiving it, so neither side has to wait on the
        other — that&rsquo;s why people lump them together. But they&rsquo;re built on opposite ideas. Kafka{" "}
        <em>keeps</em> every message and lets many readers replay the same history; RabbitMQ <em>delivers</em> a
        message to one consumer and then deletes it. Almost every difference below falls out of that one distinction.
      </Lede>

      <Callout>
        <A href="/technologies/kafka">Kafka</A> is a <strong>distributed commit log</strong>: messages are appended
        and kept around, and independent consumer groups can replay the stream from any point (its <strong>offset</strong>).{" "}
        <A href="/technologies/rabbitmq">RabbitMQ</A> is a <strong>smart broker</strong>: a component called an{" "}
        <strong>exchange</strong> routes each message into one or more queues, a consumer confirms (&ldquo;acks&rdquo;)
        it, and it&rsquo;s removed. Kafka optimizes for throughput and replay; RabbitMQ optimizes for flexible routing
        and handing each message to one consumer at a time — though like most brokers, its default guarantee is{" "}
        <A href="/concepts/delivery-semantics">at-least-once</A>, so a redelivered message can occasionally arrive twice.
      </Callout>

      <H2 id="simulation">See them run</H2>
      <P>
        The same traffic drives both. Push the load past what the consumers can handle and watch the backlog (lag) build
        on each broker — under pure load they behave similarly. The <em>real</em> differences — replay, routing,
        retention — are semantic, and they&rsquo;re in the table further down.
      </P>
      <Figure wide caption="Same traffic, both brokers. Raise the load and watch lag build on each.">
        <ComparisonSim
          left={{ title: "Kafka (log + consumer group)", blueprint: TECH_BLUEPRINTS.kafka.intermediate.blueprint }}
          right={{ title: "RabbitMQ (work queue)", blueprint: TECH_BLUEPRINTS.rabbitmq.intermediate.blueprint }}
        />
      </Figure>

      <H2 id="throughput">Throughput &amp; latency</H2>
      <P>
        Kafka is built for <strong>throughput</strong>: it writes to the log sequentially and reads with a &ldquo;zero-copy&rdquo;
        trick (sending bytes straight from the disk cache to the network, instead of copying them through the
        application first). That combination lets one cluster move millions of messages a second. RabbitMQ gives you{" "}
        <strong>low per-message latency</strong> and per-message acknowledgement, but its routing logic and ack
        bookkeeping cap its raw throughput below Kafka&rsquo;s. If the stream itself is the product, that ceiling
        matters; for everyday task queues, it rarely does.
      </P>

      <PullQuote>Kafka keeps the story so anyone can re-read it. RabbitMQ hands each task to one worker and moves on.</PullQuote>

      <H2 id="replay">Replay &amp; failure behavior</H2>
      <P>
        Because Kafka <strong>retains</strong> messages, a crashed consumer just resumes from its last committed offset —
        and can rewind to reprocess history after a bug. RabbitMQ <strong>redelivers</strong> un-acked messages to another
        consumer, but there&rsquo;s no replay of messages already acked and deleted. That single fact — retain vs delete —
        is why Kafka powers event sourcing and data pipelines while RabbitMQ powers work queues.
      </P>

      <H2 id="matrix">Side by side</H2>
      <CompareTable
        columns={["Apache Kafka", "RabbitMQ"]}
        rows={[
          { feature: "Core model", values: ["Distributed append-only log", "Smart broker with queues"] },
          { feature: "After a read", values: ["Retained (deleted by time/size)", "Acked → removed from the queue"] },
          { feature: "Replay history", values: ["Yes — rewind to any offset", "No — once consumed, it's gone"] },
          { feature: "Ordering", values: ["Guaranteed within a partition", "Per-queue; weakened by requeues"] },
          { feature: "Routing", values: ["Consumers pull by topic/partition", "Rich: direct, topic, fanout, headers"] },
          { feature: "Throughput", values: ["Very high (sequential I/O)", "High, but lower than Kafka"] },
          { feature: "Scaling", values: ["Partitions (caps consumers)", "Competing consumers per queue"] },
          { feature: "Best fit", values: ["Event streaming, log pipelines", "Task queues, routing, RPC"] },
        ]}
      />

      <H2 id="choose">Which should you use?</H2>
      <ChooseWhen
        options={[
          { name: "Kafka", color: "#38bdf8", points: ["Event streaming & high-throughput pipelines", "Many independent consumers of one stream", "You need to replay history", "Ordering within a partition matters"] },
          { name: "RabbitMQ", color: "#fb923c", points: ["Task / work queues consumed once", "Complex routing (topic / fanout / headers)", "Request–response or priority handling", "Lower operational footprint"] },
        ]}
      />
      <P>
        For a plain &ldquo;producer → queue → worker&rdquo; decoupling, either is fine — pick the one your team already
        runs well. Reach for Kafka when the <em>data stream</em> is the product; reach for RabbitMQ when <em>work
        distribution and routing</em> are.
      </P>

      <Related
        links={[
          { href: "/comparisons/rest-vs-grpc-vs-graphql", label: "REST vs gRPC vs GraphQL" },
          { href: "/technologies/kafka", label: "Kafka" },
          { href: "/technologies/rabbitmq", label: "RabbitMQ" },
          { href: "/concepts/delivery-semantics", label: "Delivery Semantics" },
          { href: "/concepts/outbox", label: "Transactional Outbox" },
        ]}
      />
    </Article>
  );
}
