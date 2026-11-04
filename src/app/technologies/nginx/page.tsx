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
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">Technology</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">Beginner → Advanced</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Nginx</h1>
        <p className="mt-2 text-slate-400">
          A high-performance reverse proxy and load balancer that fronts your application servers.
        </p>
      </header>

      <Section id="overview" title="1. Overview">
        <p>
          Nginx sits between clients and your app servers. As a <strong>reverse proxy</strong>, it&rsquo;s the single
          public entry point that hides your app servers from the internet. As a <strong>load balancer</strong>, it
          spreads incoming requests across a pool of those app servers. It also terminates TLS (handles the
          HTTPS encryption), serves static files directly, and caches responses.
        </p>
      </Section>

      <Section id="why" title="2. Why it exists">
        <p>
          You don&rsquo;t want clients talking directly to your app servers: you want one stable public address, even
          traffic distribution across however many servers you&rsquo;re running, a single place to terminate TLS, and
          somewhere to cache repeat requests. Nginx does all of this with very little overhead.
        </p>
      </Section>

      <Section id="simulation" title="3. Interactive Simulation">
        <p>
          <strong>Beginner</strong>{" "}proxies to a single app server. <strong>Intermediate</strong>{" "}load-balances across
          three. <strong>Advanced</strong>{" "}is a full edge setup: Nginx → app pool → cache → database. Raise the
          traffic and watch it spread evenly across the pool.
        </p>
        <TechSimulator tech="nginx" />

        <h3 className="mt-6 text-base font-semibold text-slate-100">Internals: proxy cache &amp; health checks</h3>
        <p>
          Nginx acting as a caching reverse proxy. Request the same path twice — the first request misses, goes to an
          upstream server, and gets cached; the second is served straight from the cache, no upstream involved. Take
          one upstream down and health-checked routing skips it automatically; take all of them down and you get a
          502 error instead.
        </p>
        <NginxCacheViz />
      </Section>

      <Section id="scaling" title="4. Scaling">
        <p>
          Add more upstream servers to the pool, and Nginx round-robins requests across them, so throughput scales
          roughly horizontally. Nginx itself can handle tens of thousands of connections per node, thanks to its
          event-driven (non-blocking) design rather than one thread per connection.
        </p>
      </Section>

      <Section id="failure" title="5. Failure Scenarios">
        <p>
          In production, Nginx health-checks its upstreams and stops routing to one that&rsquo;s down — exactly what
          the proxy-cache demo above does when you take an upstream down. The main simulator below is simpler,
          though: its load balancer always round-robins across every server it knows about, healthy or not, so{" "}
          <strong>Kill</strong>{" "}an app server there and that server&rsquo;s share of traffic doesn&rsquo;t get
          rerouted to its peers — it just errors out (watch <strong>Errors</strong>{" "}climb by roughly one divided by
          the number of app servers). Real Nginx would skip the dead server entirely, which is the behavior the
          cache demo above illustrates instead.
        </p>
        <p>
          Nginx itself can become a single point of failure, which is why real deployments usually run two Nginx
          instances behind a shared virtual IP.
        </p>
      </Section>

      <Section id="metrics" title="6. Metrics">
        <p>Watch for even utilisation across the upstream pool, and overall p95/p99 latency as you scale the pool up or down.</p>
      </Section>

      <Section id="tradeoffs" title="7. Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>An extra network hop and a potential single choke-point, in exchange for a stable public endpoint and evenly spread load.</li>
          <li>Configuration is powerful but easy to get subtly wrong — buffering, timeouts, and header handling are common gotchas.</li>
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

      <Section id="how-to-use" title="How to use it">
        <p>Define an upstream pool, proxy to it, and cache static assets:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`proxy_cache_path /var/cache/nginx keys_zone=assets:10m max_size=1g;  # define the cache zone once, in the http block

upstream app {
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
