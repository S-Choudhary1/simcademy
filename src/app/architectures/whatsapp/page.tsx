import Link from "next/link";
import type { Metadata } from "next";
import { EmbeddedSim } from "@/sim/ui/EmbeddedSim";
import { ARCH_BY_SLUG } from "@/sim/architectures";

export const metadata: Metadata = {
  title: "WhatsApp / Chat — Architecture",
  description:
    "How a chat system like WhatsApp is designed: a gateway, a chat service that publishes to a broker, and delivery workers that fan out messages. Interactive architecture simulation.",
  keywords: ["whatsapp architecture", "chat system design", "message queue", "fan-out", "delivery", "real-time messaging"],
};

const arch = ARCH_BY_SLUG["whatsapp"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function WhatsAppPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Architectures</span> / <span className="text-slate-300">WhatsApp / Chat</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">Architecture</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">WhatsApp / Chat</h1>
        <p className="mt-2 text-slate-400">{arch.blurb}</p>
      </header>

      <Section title="1. Business Problem">
        <p>
          Deliver messages between users in near real time, reliably, even when the recipient is offline. The sender
          should get an instant &ldquo;sent&rdquo; while actual delivery happens asynchronously — the classic case for
          decoupling with a broker.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Send a message; persist it; deliver to one or many recipients.</li>
          <li>Delivery receipts (sent / delivered / read) and offline queueing.</li>
          <li>Presence (online/last-seen) and group fan-out.</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Low send latency regardless of delivery backlog.</li>
          <li>No lost messages — at-least-once delivery, deduped by message id.</li>
          <li>Elastic delivery throughput for spikes (a viral group, New Year&rsquo;s Eve).</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          The chat service accepts a message and publishes it to the broker, returning immediately — so send latency
          stays flat no matter how deep the backlog. Delivery workers drain the broker and fan messages out. Push the
          traffic up: the broker backlog (lag) grows until you have enough consumers.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          Send: client → gateway → chat service → persist → publish <em>MessageSent</em> to the broker → ack the sender.
          Deliver: a delivery worker consumes the event, pushes to the recipient&rsquo;s connected device (or stores it
          for when they reconnect), and records a receipt.
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Gateway</strong> — holds the persistent WebSocket connections and routes to the chat service.</li>
          <li><strong>Broker</strong> — decouples send from deliver; the backlog absorbs spikes. Its lag is the key metric.</li>
          <li><strong>Delivery workers</strong> — a consumer group; add workers to raise delivery throughput.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          Scale connection gateways horizontally (sticky by user). Scale delivery by adding workers to the consumer
          group. Partition the broker by conversation/user so ordering holds per chat while throughput scales across
          partitions.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          Kill a delivery worker: its share redistributes and the backlog climbs until it recovers — but nothing is
          lost, because the broker retains messages until acked. To publish reliably from the chat service, use the{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">transactional outbox</Link>.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          WebSocket gateways, a chat service, and{" "}
          <Link href="/technologies/kafka" className="text-sky-400 hover:text-sky-300">Kafka</Link> (or{" "}
          <Link href="/technologies/rabbitmq" className="text-sky-400 hover:text-sky-300">RabbitMQ</Link>) as the broker,
          with a wide-column store (Cassandra) or{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link> for message
          history.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>Persist + publish on send, then a delivery worker consumes and fans out:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// client holds a WebSocket to the gateway; send is a quick publish
POST /messages   { "to": "u42", "text": "hi" }
  chatService: persist(message)
               publish("MessageSent", message)   // via the outbox
               → 202 { "id": "m_88", "status": "sent" }   // fast ack

// delivery worker (a consumer group on the broker)
consumer.on("MessageSent", (m) => {
  if (isOnline(m.to)) pushOverSocket(m.to, m)
  else queueForReconnect(m.to, m)
  ack()                          // at-least-once → recipient dedupes by m.id
})`}
        </pre>
      </Section>

      <Section title="11. Alternatives & Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Push (fan-out on write) vs pull (fan-out on read) for large groups — a hybrid is common.</li>
          <li>At-least-once + idempotency vs the (impractical) goal of exactly-once delivery.</li>
          <li>End-to-end encryption pushes fan-out and receipts to the client, changing the server&rsquo;s role.</li>
        </ul>
      </Section>
    </main>
  );
}
