import Link from "next/link";
import type { Metadata } from "next";
import { TechSimulator } from "@/sim/ui/TechSimulator";
import { NginxCacheViz } from "@/concepts/NginxCacheViz";

export const metadata: Metadata = {
  title: "Nginx — Interactive Simulation",
  description:
    "Explore how Nginx works as a reverse proxy and load balancer: single upstream, upstream pools, and a full edge with caching. Interactive simulation.",
  keywords: ["Nginx", "reverse proxy", "load balancer", "upstream", "edge", "web server"],
  alternates: { canonical: "/technologies/nginx" },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-800 py-8 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function NginxPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Technologies</span> / <span className="text-slate-300">Nginx</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">Technology</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">Beginner</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Nginx</h1>
        <p className="mt-2 text-slate-400">
          A high-performance reverse proxy and load balancer that fronts your application servers.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          Nginx sits between clients and your app servers. As a <strong>reverse proxy</strong> it is the single public
          entry point; as a <strong>load balancer</strong> it spreads requests across a pool of upstream servers. It
          also terminates TLS, serves static files, and caches responses.
        </p>
      </Section>

      <Section id="why" title="2. Why it exists">
        <p>
          You do not want clients talking directly to app servers: you need one stable endpoint, even load
          distribution, TLS termination, and a place to cache. Nginx does all of this with very low overhead.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          <strong>Beginner</strong> proxies to one app server. <strong>Intermediate</strong> load-balances across three.{" "}
          <strong>Advanced</strong> is a full edge: Nginx → app pool → cache → database. Raise the traffic and watch it
          spread evenly.
        </p>
        <TechSimulator tech="nginx" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: proxy cache &amp; health checks</h3>
        <p>
          Nginx as a caching reverse proxy. Request a path twice — the first misses to an upstream and gets cached, the
          second is served straight from the cache. Take an upstream down and health-checked routing skips it; take
          them all down for a 502.
        </p>
        <NginxCacheViz />
      </Section>

      <Section id="scaling" title="4. Scaling">
        <p>
          Add upstream servers to the pool and Nginx round-robins across them, so throughput scales horizontally. Nginx
          itself handles tens of thousands of connections per node thanks to its event-driven model.
        </p>
      </Section>

      <Section id="failure" title="5. Failure Scenarios">
        <p>
          In production Nginx health-checks upstreams and stops routing to a dead one. Kill an app server in the
          simulation to see the load its peers must absorb. Nginx itself is a potential single point of failure — real
          deployments run it in pairs behind a virtual IP.
        </p>
      </Section>

      <Section id="metrics" title="6. Metrics">
        <p>Watch even utilisation across the upstream pool and overall p95/p99 as you scale the pool up or down.</p>
      </Section>

      <Section id="tradeoffs" title="7. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Extra hop and single choke-point vs. a stable endpoint and even load.</li>
          <li>Config is powerful but easy to get subtly wrong (buffering, timeouts, headers).</li>
        </ul>
      </Section>

      <Section id="usage" title="8. Real-world Usage">
        <p>Reverse proxy, load balancer, TLS terminator, static/edge cache, and API gateway front for a huge share of the web.</p>
      </Section>

      <Section id="interview" title="9. Interview Questions">
        <ol className="list-decimal space-y-1 pl-5">
          <li>How does a reverse proxy differ from a forward proxy?</li>
          <li>How does Nginx handle so many concurrent connections?</li>
          <li>How would you avoid Nginx being a single point of failure?</li>
        </ol>
      </Section>

      <Section id="usage" title="How to use it">
        <p>Define an upstream pool, proxy to it, and cache static assets:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`upstream app {
  least_conn;
  server app-a:8080;
  server app-b:8080;
}
server {
  listen 443 ssl;                        # terminate TLS here
  location / { proxy_pass http://app; }
  location /static/ { proxy_cache assets; proxy_pass http://app; }
}`}
        </pre>
        <p>Run Nginx as a pair behind a virtual IP so it isn&rsquo;t itself a single point of failure.</p>
      </Section>

      <Section id="references" title="10. References">
        <ul className="list-disc space-y-1 pl-5">
          <li>Nginx documentation — Load Balancing &amp; Reverse Proxy</li>
        </ul>
      </Section>
    </main>
  );
}
