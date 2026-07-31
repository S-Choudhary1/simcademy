import type { Metadata } from "next";
import { Article, Breadcrumb, Kicker, Title, Dek, Meta, Versus, Lede, H2, P, Callout, PullQuote, CompareTable, ChooseWhen, Related, A } from "@/components/article";

export const metadata: Metadata = {
  title: "REST vs gRPC vs GraphQL — Comparison",
  description:
    "Three ways to build an API compared: REST's resources over HTTP, gRPC's fast binary contracts for service-to-service calls, and GraphQL's client-shaped queries. Where each fits and where each hurts.",
  keywords: ["REST vs gRPC", "GraphQL vs REST", "gRPC vs GraphQL", "API design", "Protobuf", "HTTP/2", "over-fetching", "BFF", "microservices communication"],
  alternates: { canonical: "/comparisons/rest-vs-grpc-vs-graphql" },
};

export default function RestGrpcGraphqlPage() {
  return (
    <Article>
      <Breadcrumb section="Comparisons" sectionHref="/comparisons" title="REST vs gRPC vs GraphQL" />
      <Kicker>Comparison · APIs</Kicker>
      <Title>REST vs gRPC vs GraphQL</Title>
      <Dek>Three answers to &ldquo;how do two programs talk?&rdquo; — resources, contracts, or queries. They&rsquo;re not rivals so much as tools for different jobs.</Dek>
      <Meta read="8 min read" tag="API design" />

      <Versus
        sides={[
          { name: "REST", tag: "Resources addressed by URL over plain HTTP + JSON.", color: "#38bdf8", icon: "🌐" },
          { name: "gRPC", tag: "Typed contracts, binary Protobuf over HTTP/2 — fast.", color: "#34d399", icon: "⚡" },
          { name: "GraphQL", tag: "One endpoint; the client asks for exactly the fields it wants.", color: "#f472b6", icon: "◈" },
        ]}
      />

      <Lede>
        Every API answers the same question — how does one program ask another for something — but they optimize for
        different pain. REST optimizes for <em>simplicity and reach</em>, gRPC for <em>speed and strictness</em> between
        services, and GraphQL for <em>the client&rsquo;s convenience</em>. Choosing well means knowing whose pain you&rsquo;re
        solving.
      </Lede>

      <Callout>
        <strong>REST</strong> models everything as resources you <code>GET</code>/<code>POST</code> at URLs — universal,
        cacheable, easy to debug. <strong>gRPC</strong> defines methods in a <code>.proto</code> contract and sends
        compact binary over HTTP/2 — great for chatty internal service-to-service calls. <strong>GraphQL</strong> gives
        the client one endpoint and a query language to fetch exactly the fields it needs in one round trip — great for
        rich frontends over many data sources.
      </Callout>

      <H2 id="rest">REST — the lingua franca</H2>
      <P>
        REST is resources over HTTP: <code>GET /users/42</code>, <code>POST /orders</code>. It rides everything HTTP
        already gives you — status codes, caching, <A href="/technologies/nginx">proxies</A>, and browser support — and
        anyone can debug it with <code>curl</code>. The weaknesses show at the edges: you often <strong>over-fetch</strong>{" "}
        (the endpoint returns fields you don&rsquo;t need) or <strong>under-fetch</strong> (you call three endpoints to
        render one screen), and there&rsquo;s no enforced schema unless you bolt on OpenAPI.
      </P>

      <H2 id="grpc">gRPC — contracts for services</H2>
      <P>
        gRPC starts from a <strong>Protobuf contract</strong>: you declare messages and methods, and it generates typed
        client and server code in every language. Calls travel as compact binary over HTTP/2, with streaming and
        multiplexing built in. That makes it excellent for <A href="/concepts/consistent-hashing">internal</A>{" "}
        service-to-service traffic where latency and strict typing matter. The cost: it&rsquo;s not natively
        browser-friendly (needs a proxy), the binary payloads aren&rsquo;t human-readable, and the contract is another
        artifact to version.
      </P>

      <PullQuote>REST is a postcard anyone can read. gRPC is a sealed, typed envelope between machines that already agreed on the format.</PullQuote>

      <H2 id="graphql">GraphQL — the client&rsquo;s query language</H2>
      <P>
        GraphQL exposes a single endpoint and a typed graph of your data; the client sends a query for exactly the
        fields it wants and gets them in one response. That kills over- and under-fetching and is a gift for complex
        frontends aggregating many sources (a classic <strong>backend-for-frontend</strong>). The costs are real:
        caching is harder (it&rsquo;s usually one <code>POST</code>), a naive resolver triggers the{" "}
        <strong>N+1 query</strong> problem, and a permissive query can be expensive — you need depth limits and
        dataloaders.
      </P>

      <H2 id="matrix">Side by side</H2>
      <CompareTable
        columns={["REST", "gRPC", "GraphQL"]}
        rows={[
          { feature: "Style", values: ["Resources / URLs", "Remote procedure calls", "Query a data graph"] },
          { feature: "Payload", values: ["JSON (text)", "Protobuf (binary)", "JSON (text)"] },
          { feature: "Transport", values: ["HTTP/1.1 or 2", "HTTP/2", "HTTP (usually POST)"] },
          { feature: "Schema / typing", values: ["Optional (OpenAPI)", "Required (.proto)", "Required (SDL)"] },
          { feature: "Browser-native", values: ["Yes", "No (needs proxy)", "Yes"] },
          { feature: "Caching", values: ["Easy (HTTP caching)", "Manual", "Harder (one endpoint)"] },
          { feature: "Fetch shape", values: ["Fixed per endpoint", "Fixed per method", "Client-defined"] },
          { feature: "Sweet spot", values: ["Public / simple APIs", "Internal microservices", "Rich, aggregating frontends"] },
        ]}
      />

      <H2 id="choose">Which should you use?</H2>
      <ChooseWhen
        options={[
          { name: "REST", color: "#38bdf8", points: ["Public API or simple CRUD", "You want HTTP caching & easy debugging", "Broadest client compatibility"] },
          { name: "gRPC", color: "#34d399", points: ["Internal service-to-service calls", "Low latency & strict contracts matter", "Polyglot backend, streaming"] },
          { name: "GraphQL", color: "#f472b6", points: ["Rich frontend over many sources", "Clients need varied data shapes", "Over/under-fetching hurts you"] },
        ]}
      />
      <P>
        In practice these coexist: a public <strong>REST</strong> API at the edge, <strong>gRPC</strong> between your
        internal services, and a <strong>GraphQL</strong> gateway for the web and mobile apps. The question is never
        &ldquo;which one wins&rdquo; — it&rsquo;s &ldquo;which one for this boundary.&rdquo;
      </P>

      <Related
        links={[
          { href: "/comparisons/kafka-vs-rabbitmq", label: "Kafka vs RabbitMQ" },
          { href: "/comparisons/monolith-vs-microservices", label: "Monolith vs Microservices" },
          { href: "/concepts/circuit-breaker", label: "Circuit Breaker" },
          { href: "/concepts/rate-limiting", label: "Rate Limiting" },
        ]}
      />
    </Article>
  );
}
