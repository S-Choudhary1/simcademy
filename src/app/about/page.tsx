import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Simcademy is an interactive academy for system design — learn distributed systems, databases, and backend engineering by exploring, modifying, and breaking real systems safely in the browser.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-slate-50">About Simcademy</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-slate-300">
        Simcademy is an interactive academy for <strong>system design</strong>. Most resources explain distributed
        systems with static diagrams and walls of text. We think you learn infrastructure the same way you learn to
        ride a bike — by doing, and by falling off safely. So everything here is something you can <em>run</em>.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-100">What&rsquo;s inside</h2>
      <ul className="mt-4 space-y-2 pl-5 text-[16px] leading-relaxed text-slate-300 [&>li]:list-disc marker:text-slate-600">
        <li><strong>A request simulator</strong> — build a system from components, send real traffic through it, and watch latency, throughput, and errors respond. Then break it and see how it copes.</li>
        <li><strong>Interactive concepts</strong> — purpose-built visualizations for CAP, ACID, consensus (Raft), sharding, isolation levels, rate limiting, and more.</li>
        <li><strong>Technology deep-dives</strong> — Kafka, PostgreSQL, MongoDB, Redis, Cassandra, and others, with their internals visualized.</li>
        <li><strong>Real-world architectures</strong> — runnable case studies (URL shortener, news feed, typeahead, chat, payments) with full design breakdowns.</li>
        <li><strong>Honest comparisons</strong> — SQL vs NoSQL, Kafka vs RabbitMQ, monolith vs microservices, and more, written to inform rather than hype.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-slate-100">Our principles</h2>
      <ul className="mt-4 space-y-2 pl-5 text-[16px] leading-relaxed text-slate-300 [&>li]:list-disc marker:text-slate-600">
        <li><strong>Correct over impressive.</strong>{" "}A simulation only models what it can model accurately — the rest gets a dedicated, honest visualization. We fact-check claims against primary sources.</li>
        <li><strong>Learn by doing.</strong>{" "}Every idea is something you can run, tune, and break.</li>
        <li><strong>Free and open to explore.</strong>{" "}No signup to learn.</li>
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/playground" className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Open the Playground →</Link>
        <Link href="/contact" className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800">Get in touch</Link>
      </div>
    </main>
  );
}
