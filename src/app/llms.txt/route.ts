import { TECHNOLOGIES, CONCEPTS, COMPARISONS } from "@/content/catalog";
import { ARCHITECTURES } from "@/sim/architectures";

/* /llms.txt — a curated, LLM-friendly map of the site (the llms.txt
 * convention: https://llmstxt.org). Built from the same catalog as the
 * sitemap, so it never drifts. Served as text/markdown. */

const BASE = "https://simcademy.app";

function section(title: string, base: string, items: { slug: string; name: string; blurb: string }[]): string {
  const lines = items.map((i) => `- [${i.name}](${BASE}${base}/${i.slug}): ${i.blurb}`);
  return `## ${title}\n\n${lines.join("\n")}`;
}

export function GET() {
  const body = `# Simcademy

> Simcademy is an interactive academy for system design. Learn distributed systems, databases, and backend engineering through browser-based simulations you can run, tune, and break. Every concept is a purpose-built, fact-checked visualization rather than a static diagram.

Simcademy covers technologies (Kafka, PostgreSQL, MongoDB, Redis, Cassandra, RabbitMQ, Nginx), core distributed-systems concepts (CAP, ACID, consensus/Raft, sharding, isolation levels, rate limiting, delivery semantics, and more), runnable real-world architectures, and honest head-to-head comparisons. Content is educational and aims for correctness over hype.

## Start here

- [Playground](${BASE}/playground): Build a system from components, send real traffic through it, and watch latency, throughput, and errors respond — then inject failures to see how it copes.
- [About](${BASE}/about): What Simcademy is and the principles behind it (correct over impressive; learn by doing).

${section("Technologies", "/technologies", TECHNOLOGIES)}

${section("Concepts", "/concepts", CONCEPTS)}

${section("Architectures", "/architectures", ARCHITECTURES.map((a) => ({ slug: a.slug, name: a.name, blurb: a.blurb })))}

${section("Comparisons", "/comparisons", COMPARISONS)}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
