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
          Deliver messages between users in near real time and reliably, even if the recipient is offline right now.
          The sender should see &ldquo;sent&rdquo; immediately, while the actual delivery happens a moment later in
          the background. That gap — confirm fast, deliver separately — is the classic reason to put a{" "}
          <strong>broker</strong> (a middleman service that temporarily holds messages) between sending and
          delivering.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Send a message, save it, and deliver it to one recipient or a whole group.</li>
          <li>Delivery receipts (sent / delivered / read) and queueing for recipients who are offline.</li>
          <li>Presence (online / last-seen) and fan-out to every member of a group.</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Sending feels instant no matter how big the delivery backlog is.</li>
          <li>No lost messages — &ldquo;at-least-once&rdquo; delivery, with duplicates removed by message id.</li>
          <li>Delivery capacity that scales up automatically for spikes (a message going viral in a group, or everyone messaging at midnight on New Year&rsquo;s Eve).</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          The chat service accepts a message, hands it to the broker, and immediately tells the sender
          &ldquo;sent&rdquo; — so sending feels instant no matter how deep the delivery backlog is. Delivery workers
          then pull messages off the broker and send them out to recipients. Push the traffic up in the simulation
          below and watch the broker&rsquo;s backlog (how many messages are waiting, also called <strong>lag</strong>)
          grow until there are enough workers to keep up.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          <strong>Send:</strong> your client talks to a <strong>gateway</strong> (the server holding your live
          connection), which forwards the message to the chat service. The chat service saves the message, publishes
          a <em>MessageSent</em> event to the broker, and confirms back to the sender right away — before anyone has
          actually received it yet.
        </p>
        <p>
          <strong>Deliver:</strong> a delivery worker picks up that event and either pushes it straight to the
          recipient&rsquo;s device (if they&rsquo;re online) or stores it to send the moment they reconnect, then
          records a delivery receipt.
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Gateway</strong> — holds the long-lived connection (a WebSocket) your app keeps open to the server, and routes your messages to the chat service.</li>
          <li><strong>Broker</strong> — a queue sitting between &ldquo;send&rdquo; and &ldquo;deliver&rdquo; so the two can run at different speeds; if delivery slows down, messages pile up safely in the broker instead of being lost. How full that queue gets (the <strong>lag</strong>) is the number to watch.</li>
          <li><strong>Delivery workers</strong> — a group of processes reading from the broker together (a &ldquo;consumer group&rdquo;); add more workers to deliver messages faster.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          Add more gateway servers as more users connect — route each user&rsquo;s connection consistently to the
          same gateway (&ldquo;sticky&rdquo; routing) so it keeps track of their live socket correctly. Add more
          delivery workers to the consumer group to raise delivery throughput. Split the broker into separate lanes
          (<strong>partitions</strong>), typically one per conversation or user, so messages within one chat stay in
          order while different chats are processed in parallel.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          Kill a delivery worker and its share of the work is automatically reassigned to the rest — the backlog
          grows until it recovers, but nothing is lost, because the broker keeps every message until a worker
          confirms (&ldquo;acknowledges&rdquo;) that it delivered it. To make sure the chat service never saves a
          message without also publishing it (or the reverse), it uses the{" "}
          <Link href="/concepts/outbox" className="text-sky-400 hover:text-sky-300">transactional outbox</Link>{" "}
          pattern.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          WebSocket gateways, a chat service, and{" "}
          <Link href="/technologies/kafka" className="text-sky-400 hover:text-sky-300">Kafka</Link> (or{" "}
          <Link href="/technologies/rabbitmq" className="text-sky-400 hover:text-sky-300">RabbitMQ</Link>) as the
          message broker, with a high-write store like Cassandra or{" "}
          <Link href="/technologies/mongodb" className="text-sky-400 hover:text-sky-300">MongoDB</Link> to hold
          message history.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>Save and publish on send, then a delivery worker consumes the event and fans it out:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// client holds a WebSocket to the gateway; sending is just a quick publish
POST /messages   { "to": "u42", "text": "hi" }
  chatService: persist(message)
               publish("MessageSent", message)   // via the outbox
               → 202 { "id": "m_88", "status": "sent" }   // fast ack — not yet delivered

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
          <li><strong>Push</strong> (deliver to every member&rsquo;s device the moment a message is sent) vs <strong>pull</strong> (just record that a new message exists, and let each device fetch it when it opens the chat) for large groups — most real chat apps use a hybrid of the two.</li>
          <li><strong>At-least-once delivery + deduping by message id</strong> (practical) vs the goal of true &ldquo;exactly-once&rdquo; delivery, which is effectively impossible to guarantee over an unreliable network.</li>
          <li>End-to-end encryption means the server can no longer read message contents — fan-out to multiple devices and read receipts shift from server logic to client logic.</li>
        </ul>
      </Section>
    </main>
  );
}
