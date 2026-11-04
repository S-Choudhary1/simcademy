import type { Metadata } from "next";
import { ComparisonSim } from "@/sim/ui/ComparisonSim";
import { TECH_BLUEPRINTS } from "@/sim/blueprints";
import { Article, Breadcrumb, Kicker, Title, Dek, Meta, Versus, Lede, H2, P, Callout, PullQuote, Figure, CompareTable, ChooseWhen, Related, A } from "@/components/article";

export const metadata: Metadata = {
  title: "PostgreSQL vs MongoDB — Comparison",
  description:
    "PostgreSQL vs MongoDB compared: relational rows with strong transactions and read replicas, versus flexible documents that shard for horizontal write scale. Data model, transactions, scaling, and failure — with a live side-by-side simulation.",
  keywords: ["PostgreSQL vs MongoDB", "relational vs document", "SQL vs NoSQL", "read replicas", "sharding", "ACID", "database comparison"],
  alternates: { canonical: "/comparisons/postgresql-vs-mongodb" },
};

export default function PostgresVsMongoPage() {
  return (
    <Article>
      <Breadcrumb section="Comparisons" sectionHref="/comparisons" title="PostgreSQL vs MongoDB" />
      <Kicker>Comparison · Databases</Kicker>
      <Title>PostgreSQL vs MongoDB</Title>
      <Dek>Relational rows with strong transactions and read replicas, versus flexible documents that shard for write scale.</Dek>
      <Meta read="7 min read" tag="Databases" />

      <Versus
        sides={[
          { name: "PostgreSQL", tag: "Relational tables, SQL, foreign keys, full ACID — scales reads with replicas.", color: "#38bdf8", icon: "🐘" },
          { name: "MongoDB", tag: "Flexible JSON-like documents that shard across nodes to scale writes.", color: "#34d399", icon: "🍃" },
        ]}
      />

      <Lede>
        This is the SQL-vs-NoSQL debate made concrete. Postgres wants your data split into small, <em>normalized</em>{" "}
        pieces that it reassembles with joins when you query; Mongo wants your data <em>pre-shaped into documents</em>{" "}
        that are ready to read as-is, spread across machines (<strong>shards</strong>). The core trade: relational
        integrity and query power, versus schema flexibility and horizontal write scale.
      </Lede>

      <Callout>
        <A href="/technologies/postgresql">PostgreSQL</A> is <strong>relational</strong>: tables, SQL, foreign keys, and
        full <A href="/concepts/acid">ACID</A> transactions, scaling reads with <A href="/concepts/replication">read
        replicas</A> behind a single server that handles all writes. <A href="/technologies/mongodb">MongoDB</A> is a{" "}
        <strong>document</strong> store that <A href="/concepts/sharding">shards</A> — splits data across multiple
        servers by key — to scale writes horizontally. Model your data first — its shape decides the winner more than
        any benchmark.
      </Callout>

      <H2 id="simulation">See them run</H2>
      <P>
        The same traffic drives both scaled-out setups: Postgres spreads reads across replicas behind a read router;
        MongoDB spreads load across shards behind <code>mongos</code> (MongoDB&rsquo;s built-in router that sends each
        request to the right shard). Raise the traffic and watch the load distribute.
      </P>
      <Figure wide caption="Postgres scaling reads across replicas (left) vs MongoDB spreading load across shards (right).">
        <ComparisonSim
          left={{ title: "PostgreSQL (read replicas)", blueprint: TECH_BLUEPRINTS.postgresql.advanced.blueprint }}
          right={{ title: "MongoDB (sharding)", blueprint: TECH_BLUEPRINTS.mongodb.advanced.blueprint }}
        />
      </Figure>

      <H2 id="model">Data model &amp; queries</H2>
      <P>
        Postgres shines on <strong>relationships and complex queries</strong> — joins, foreign keys, and a{" "}
        <A href="/concepts/query-planning">query planner</A> that optimizes whatever you ask. Mongo shines when data is{" "}
        <strong>pre-shaped as one document</strong> so a read is a single fetch with no join — but denormalized data must
        be kept in sync on every write, and a new query you didn&rsquo;t design for can be expensive. Both index with{" "}
        <A href="/concepts/postgresql-indexing">B⁺-trees</A> under the hood.
      </P>

      <PullQuote>Postgres assembles the answer from normalized parts. Mongo stores the answer already assembled.</PullQuote>

      <H2 id="scaling">The sharpest difference: scaling writes</H2>
      <P>
        Postgres scales <strong>reads</strong> with replicas, but the <strong>write</strong> path stays one server
        until you add a sharding extension (like Citus) or partition the data yourself. MongoDB ships sharding
        built in, so writes scale <strong>horizontally</strong> across many servers — at the price of choosing a good{" "}
        <strong>shard key</strong> (the field used to decide which server stores which data). Pick it badly and one{" "}
        <strong>hot shard</strong> ends up overloaded while the rest sit idle, recreating the single-server bottleneck
        you were trying to escape.
      </P>

      <H2 id="matrix">Side by side</H2>
      <CompareTable
        columns={["PostgreSQL", "MongoDB"]}
        rows={[
          { feature: "Data model", values: ["Relational tables, fixed schema", "JSON-like documents, flexible schema"] },
          { feature: "Query language", values: ["SQL", "MQL (MongoDB's query language) + aggregation pipeline"] },
          { feature: "Transactions", values: ["Full ACID across rows & tables", "Per-document; multi-doc since 4.0 (costlier)"] },
          { feature: "Relationships", values: ["Native joins, foreign keys", "Prefer embedding; $lookup is limited"] },
          { feature: "Scaling reads", values: ["Read replicas", "Replica-set secondaries"] },
          { feature: "Scaling writes", values: ["One primary (Citus / partitions)", "Built-in sharding (shard key)"] },
          { feature: "Best fit", values: ["Relationships, integrity, complex queries", "Evolving documents, write scale-out"] },
        ]}
      />

      <H2 id="choose">Which should you pick?</H2>
      <ChooseWhen
        options={[
          { name: "PostgreSQL", color: "#38bdf8", points: ["Relational data & strong constraints", "Multi-row transactions", "Complex queries & reporting", "Default choice when unsure"] },
          { name: "MongoDB", color: "#34d399", points: ["Flexible / evolving document shapes", "Write throughput that must scale out", "Data naturally self-contained", "A known, single-shard access pattern"] },
        ]}
      />
      <P>
        It&rsquo;s rarely either/or: many systems keep Postgres as the system of record and use a document store for
        specific high-scale, denormalized workloads. Model the data first — relational → start with Postgres;
        document-shaped and write-heavy → start with Mongo.
      </P>

      <Related
        links={[
          { href: "/comparisons/sql-vs-nosql", label: "SQL vs NoSQL" },
          { href: "/concepts/postgresql-indexing", label: "PostgreSQL Indexing" },
          { href: "/concepts/mongodb-indexing", label: "MongoDB Indexing" },
          { href: "/concepts/sharding", label: "Sharding" },
          { href: "/concepts/replication", label: "Replication" },
        ]}
      />
    </Article>
  );
}
