import type { Metadata } from "next";
import { Article, Breadcrumb, Kicker, Title, Dek, Meta, Versus, Lede, H2, P, Callout, PullQuote, CompareTable, ChooseWhen, Related, A } from "@/components/article";

export const metadata: Metadata = {
  title: "SQL vs NoSQL — Comparison",
  description:
    "SQL vs NoSQL, without the hype: relational schema-on-write with joins and ACID versus flexible, horizontally-scaled data models. When each actually wins, and why 'NoSQL scales, SQL doesn't' is a myth.",
  keywords: ["SQL vs NoSQL", "relational database", "document database", "ACID", "BASE", "sharding", "schema", "PostgreSQL", "MongoDB", "Cassandra"],
  alternates: { canonical: "/comparisons/sql-vs-nosql" },
};

export default function SqlVsNoSqlPage() {
  return (
    <Article>
      <Breadcrumb section="Comparisons" sectionHref="/comparisons" title="SQL vs NoSQL" />
      <Kicker>Comparison · Databases</Kicker>
      <Title>SQL vs NoSQL</Title>
      <Dek>The most over-simplified choice in backend engineering. It isn&rsquo;t about scale — it&rsquo;s about your data model and how you read it.</Dek>
      <Meta read="7 min read" tag="Databases" />

      <Versus
        sides={[
          { name: "SQL (relational)", tag: "Rows & tables, a fixed schema, joins, and ACID transactions.", color: "#38bdf8", icon: "🗄️" },
          { name: "NoSQL", tag: "Flexible documents / key-value / wide-column, built to scale out.", color: "#34d399", icon: "🍃" },
        ]}
      />

      <Lede>
        &ldquo;Use NoSQL, it scales&rdquo; is the advice that has caused more rewrites than almost any other. The truth
        is quieter: relational databases scale to enormous workloads, and most NoSQL wins come from a different data
        model, not a bigger one. Pick based on <em>how your data is shaped and queried</em>, not on a throughput myth.
      </Lede>

      <Callout>
        <strong>SQL</strong> stores normalized rows with a schema enforced on write, and lets you join and transact
        across them with strong guarantees. <strong>NoSQL</strong> is an umbrella for stores that relax one or more of
        those — a flexible schema, no joins, eventual consistency — usually in exchange for horizontal scale or a data
        model that fits the problem better. Neither is &ldquo;faster.&rdquo; They&rsquo;re shaped for different access
        patterns.
      </Callout>

      <H2 id="model">It&rsquo;s a data-model decision</H2>
      <P>
        A relational database wants your data <strong>normalized</strong>: each fact in one place, related by keys, and
        assembled at read time with <strong>joins</strong>. That&rsquo;s ideal when the same data is queried many
        different ways and integrity matters — an order references a customer, which references an address, and none of
        them drift out of sync.
      </P>
      <P>
        NoSQL flips it. A document store like <A href="/technologies/mongodb">MongoDB</A> keeps the whole aggregate — the
        order <em>with</em> its line items — in one document, so a read is a single lookup with no join. A wide-column
        store like <A href="/technologies/cassandra">Cassandra</A> goes further: you design a table per query and{" "}
        <A href="/concepts/sharding">shard</A> it across a ring. The price is duplication and the discipline of{" "}
        <strong>query-first modeling</strong> — you can&rsquo;t just ask a new question later.
      </P>

      <PullQuote>SQL lets you ask questions you didn&rsquo;t plan for. NoSQL makes the questions you did plan for very cheap.</PullQuote>

      <H2 id="consistency">Consistency &amp; transactions</H2>
      <P>
        SQL databases give you <A href="/concepts/acid">ACID</A> transactions and tunable{" "}
        <A href="/concepts/isolation-levels">isolation levels</A> — you can move money between two rows and know the
        invariant holds. Many NoSQL stores historically offered <A href="/concepts/base">BASE</A> instead: eventual
        consistency, no multi-key transactions, and <A href="/concepts/delivery-semantics">at-least-once</A> semantics
        you dedup around. The line has blurred — MongoDB has multi-document transactions, and Cassandra has tunable
        quorums — but strong, cross-entity guarantees are still SQL&rsquo;s home turf.
      </P>

      <H2 id="scaling">The scaling myth</H2>
      <P>
        &ldquo;SQL can&rsquo;t scale&rdquo; is wrong. Postgres and MySQL scale reads with{" "}
        <A href="/concepts/replication">replicas</A> and writes with partitioning, and run some of the largest systems on
        earth. What&rsquo;s true is that NoSQL stores were <em>designed from day one</em> for horizontal sharding and
        masterless writes, so they make that path easier and more automatic. If you will genuinely outgrow one primary&rsquo;s
        write capacity, that head start matters. Most applications never get there.
      </P>

      <H2 id="matrix">Side by side</H2>
      <CompareTable
        columns={["SQL (relational)", "NoSQL"]}
        rows={[
          { feature: "Schema", values: ["Fixed, enforced on write", "Flexible, enforced by the app"] },
          { feature: "Relationships", values: ["Joins across normalized tables", "Embed / denormalize; no joins"] },
          { feature: "Transactions", values: ["ACID, multi-row", "Often single-key; improving"] },
          { feature: "Consistency", values: ["Strong by default", "Often eventual (tunable)"] },
          { feature: "Scaling", values: ["Vertical + read replicas + sharding", "Horizontal sharding, built-in"] },
          { feature: "Query flexibility", values: ["Ad-hoc, any shape (SQL)", "Query-first; new queries are hard"] },
          { feature: "Examples", values: ["PostgreSQL, MySQL", "MongoDB, Cassandra, Redis, DynamoDB"] },
        ]}
      />

      <H2 id="choose">Which should you reach for?</H2>
      <ChooseWhen
        options={[
          { name: "SQL", color: "#38bdf8", points: ["Data is relational and queried many ways", "You need transactions & strong integrity", "Reporting / ad-hoc queries matter", "You're not sure yet — it's the safe default"] },
          { name: "NoSQL", color: "#34d399", points: ["A known, fixed set of access patterns", "Huge write volume or horizontal scale is a must", "Flexible / evolving document shapes", "Simple key-value or cache-like lookups"] },
        ]}
      />
      <P>
        The pragmatic answer for most teams: <strong>start with a relational database</strong>. It&rsquo;s flexible,
        battle-tested, and gives you room to discover your access patterns. Reach for a NoSQL store when a specific part
        of the system has an access pattern or scale requirement that SQL genuinely fights you on — and often, run both.
      </P>

      <PullQuote>&ldquo;SQL vs NoSQL&rdquo; is rarely the real question. &ldquo;Which store for <em>this</em> workload&rdquo; is.</PullQuote>

      <Related
        links={[
          { href: "/comparisons/postgresql-vs-mongodb", label: "PostgreSQL vs MongoDB" },
          { href: "/concepts/acid", label: "ACID" },
          { href: "/concepts/base", label: "BASE" },
          { href: "/concepts/sharding", label: "Sharding" },
          { href: "/technologies/cassandra", label: "Cassandra" },
        ]}
      />
    </Article>
  );
}
