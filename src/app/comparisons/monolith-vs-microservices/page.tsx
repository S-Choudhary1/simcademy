import type { Metadata } from "next";
import { Article, Breadcrumb, Kicker, Title, Dek, Meta, Versus, Lede, H2, P, Callout, PullQuote, CompareTable, ChooseWhen, Related, A } from "@/components/article";
import { TopicMeme } from "@/components/memes";

export const metadata: Metadata = {
  title: "Monolith vs Microservices — Comparison",
  description:
    "Monolith vs microservices, honestly: one deployable versus many independent services. The real trade is a code-complexity problem for a distributed-systems problem. When splitting up helps, and when it just adds latency and pain.",
  keywords: ["monolith vs microservices", "microservices", "modular monolith", "distributed systems", "service boundaries", "deployment", "team autonomy", "conway's law"],
  alternates: { canonical: "/comparisons/monolith-vs-microservices" },
};

export default function MonolithVsMicroservicesPage() {
  return (
    <Article>
      <Breadcrumb section="Comparisons" sectionHref="/comparisons" title="Monolith vs Microservices" />
      <Kicker>Comparison · Architecture</Kicker>
      <Title>Monolith vs Microservices</Title>
      <Dek>You don&rsquo;t escape complexity by splitting the system up — you trade a code-complexity problem for a distributed-systems one. Choose the problem you&rsquo;d rather have.</Dek>
      <Meta read="8 min read" tag="Architecture" />

      <Versus
        sides={[
          { name: "Monolith", tag: "One codebase, one deployable. Everything in-process.", color: "#38bdf8", icon: "🧱" },
          { name: "Microservices", tag: "Many small services, deployed and scaled independently.", color: "#34d399", icon: "🧩" },
        ]}
      />

      <Lede>
        Microservices are sold as the cure for a big, tangled codebase. But a network is not a refactoring tool. The
        moment you split one process into many, every in-process function call that used to be instant and reliable
        becomes a network call that can be slow, fail, or arrive twice. That&rsquo;s the trade, in one sentence.
      </Lede>

      <Callout>
        A <strong>monolith</strong>{" "}is one deployable unit: simple to build, test, and run, but everything scales and
        ships together. <strong>Microservices</strong>{" "}split the system into independently deployable services owned by
        different teams — buying autonomy and targeted scaling at the price of network latency, partial failure,
        eventual consistency, and a lot of operational machinery.
      </Callout>

      <H2 id="calls">The function call becomes a network</H2>
      <P>
        In a monolith, module A calls module B directly, in the same process: nanoseconds, no conversion to send over
        a wire, and the only way it fails is a bug. Split A and B into separate services and that same call now has
        to travel over the network, which changes its failure modes completely. It needs an{" "}
        <A href="/comparisons/rest-vs-grpc-vs-graphql">API</A> to even talk, a format to convert data into and back
        out of for sending, and a plan for when the network itself misbehaves: automatic{" "}
        <A href="/concepts/retries-backoff">retries with backoff</A> for a call that times out, a{" "}
        <A href="/concepts/circuit-breaker">circuit breaker</A> to stop hammering a service that&rsquo;s already down,
        and <A href="/concepts/idempotency">idempotency</A> so a retried request doesn&rsquo;t accidentally double-charge
        someone. And a database update that used to be one local transaction across two tables now needs a{" "}
        <A href="/concepts/saga">saga</A> once those two tables live in two different services&rsquo; databases. None
        of this is incidental — it&rsquo;s the inherent cost of turning a function call into a network call.
      </P>

      <PullQuote>Microservices don&rsquo;t remove complexity. They move it out of your compiler and into the space between your services — where the compiler can&rsquo;t help you.</PullQuote>

      <H2 id="why">So why split at all?</H2>
      <P>
        Because past a certain size, the bottleneck isn&rsquo;t the machine — it&rsquo;s the <strong>team</strong>. When
        forty engineers share one deployable, every release is a coordinated event and one bad change blocks everyone.
        Independent services let teams <strong>deploy on their own schedule</strong>, choose their own stack, and scale
        the hot path (say, the checkout service) without scaling everything else alongside it. That organizational win
        — not raw performance — is the real reason to adopt microservices. It&rsquo;s the same idea as{" "}
        <em>Conway&rsquo;s Law</em>: a system&rsquo;s architecture tends to mirror the communication structure of the
        organization that built it, so giving teams separate services lets them actually work independently instead
        of constantly coordinating through one shared codebase.
      </P>

      <H2 id="modular">The middle path: a modular monolith</H2>
      <P>
        The false binary is &ldquo;big ball of mud&rdquo; vs &ldquo;fifty services.&rdquo; A{" "}
        <strong>modular monolith</strong> — one deployable with strict internal module boundaries — gives you most of the
        clarity of services with none of the network tax. It&rsquo;s the right starting point for almost everyone: you
        get clean seams now, and if a module later needs independent scaling or a dedicated team, those seams are
        exactly where you&rsquo;d cut a service out.
      </P>

      <H2 id="matrix">Side by side</H2>
      <CompareTable
        columns={["Monolith", "Microservices"]}
        rows={[
          { feature: "Deploy", values: ["One unit, all at once", "Independently, per service"] },
          { feature: "Inter-module calls", values: ["In-process (fast, reliable)", "Network (latency, partial failure)"] },
          { feature: "Transactions", values: ["Local ACID", "Sagas / eventual consistency"] },
          { feature: "Scaling", values: ["Whole app together", "Per service, targeted"] },
          { feature: "Team fit", values: ["Small–medium, shared code", "Many teams, clear ownership"] },
          { feature: "Ops overhead", values: ["Low", "High (CI/CD, observability, mesh)"] },
          { feature: "Debugging", values: ["One stack trace", "Distributed tracing across hops"] },
          { feature: "Failure blast radius", values: ["One process", "Contained — if you isolate well"] },
        ]}
      />

      <H2 id="choose">Which should you build?</H2>
      <ChooseWhen
        options={[
          { name: "a Monolith", color: "#38bdf8", points: ["Small or early-stage team", "Domain still changing fast", "You value shipping speed & simplicity", "Default choice — start here"] },
          { name: "Microservices", color: "#34d399", points: ["Many teams stepping on each other", "Parts need very different scaling", "Clear, stable domain boundaries", "You can fund the ops investment"] },
        ]}
      />
      <P>
        The honest guidance: <strong>start with a (modular) monolith</strong>{" "}and extract services only when a concrete
        pain — team contention, a wildly different scaling profile — forces your hand. Adopting microservices before you
        have that pain buys you distributed-systems problems with none of the benefits.
      </P>

      <div className="mt-10"><TopicMeme topic="monolith-vs-microservices" /></div>

      <Related
        links={[
          { href: "/comparisons/rest-vs-grpc-vs-graphql", label: "REST vs gRPC vs GraphQL" },
          { href: "/concepts/saga", label: "Saga" },
          { href: "/concepts/circuit-breaker", label: "Circuit Breaker" },
          { href: "/concepts/outbox", label: "Transactional Outbox" },
          { href: "/playground", label: "Try it in the Playground" },
        ]}
      />
    </Article>
  );
}
