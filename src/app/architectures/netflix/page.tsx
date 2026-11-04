import Link from "next/link";
import type { Metadata } from "next";
import { EmbeddedSim } from "@/sim/ui/EmbeddedSim";
import { ARCH_BY_SLUG } from "@/sim/architectures";

export const metadata: Metadata = {
  title: "Netflix — Architecture",
  description:
    "How Netflix serves video at scale: a CDN edge absorbs the vast majority of requests, and only misses reach the origin API stack. Interactive architecture simulation.",
  keywords: ["netflix architecture", "CDN", "video streaming", "edge cache", "system design", "origin"],
};

const arch = ARCH_BY_SLUG["netflix"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function NetflixPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        / <span className="text-slate-400">Architectures</span> / <span className="text-slate-300">Netflix</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">Architecture</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Netflix</h1>
        <p className="mt-2 text-slate-400">{arch.blurb}</p>
      </header>

      <Section title="1. Business Problem">
        <p>
          Stream video to hundreds of millions of viewers worldwide with an instant start and no buffering, while
          keeping the cost of the central infrastructure and bandwidth under control. The trick is to serve almost
          every request from the <strong>edge</strong> — servers placed physically close to the viewer — instead of
          from one central location (the <strong>origin</strong>) far away.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Browse the catalog and get personalized recommendations (a metadata API).</li>
          <li>Stream video in chunks, automatically adjusting video quality to the viewer&rsquo;s current network speed (&ldquo;adaptive bitrate&rdquo;).</li>
          <li>Track playback position and watch history.</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Instant playback start, and smooth streaming even as the viewer&rsquo;s network quality changes.</li>
          <li>Global scale with resilience per region — a problem in one region shouldn&rsquo;t take down others.</li>
          <li>The origin is protected from the full request volume — the edge absorbs almost all of it.</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          In this simulation, the CDN (<strong>content delivery network</strong> — a global network of edge servers)
          is set to serve about 95% of requests directly from the edge; only the remaining misses flow through to the
          API gateway, services, cache, and database. That 95% is just an illustrative starting point here, not a
          published Netflix number — watch how little traffic reaches the origin at that level, then drag the CDN hit
          ratio down and see the origin light up as more requests fall through to it.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          <strong>Video:</strong> the player requests video chunks from the nearest edge server (Netflix calls its own
          edge hardware &ldquo;Open Connect&rdquo; appliances), which almost always already has them cached and ready
          to serve.
        </p>
        <p>
          <strong>Metadata:</strong> browse and recommendation calls also go through the CDN first; only on a cache
          miss do they fall back to the origin API stack (gateway → services → cache → database).
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>CDN edge</strong> — video and cached API responses pre-positioned close to users; the single biggest lever for both speed and cost.</li>
          <li><strong>API gateway + services</strong> — the origin; only reached on a cache miss or for requests that genuinely need fresh computation.</li>
          <li><strong>Cache + database</strong> — sit behind the services, backing metadata, user profiles, and playback state.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          Scale mainly by pushing more content and logic out to the edge: a higher CDN hit ratio (the share of
          requests the edge can answer without involving the origin) directly shrinks origin load. The origin itself
          then scales like any ordinary web stack — stateless services behind a gateway, a cache in front of the
          database, and read replicas for metadata that&rsquo;s read far more often than it&rsquo;s written.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          Lower the CDN hit ratio in the simulation and watch the origin get overwhelmed as more traffic reaches
          it — this is exactly why edge resilience and graceful degradation matter so much here. You can also select
          the origin <strong>Cache</strong> and click <strong>Kill</strong>: every request that still reaches it
          now errors out, since this simulator treats a dead dependency as a hard failure rather than something
          that quietly falls back to the database. (Deleting the cache node instead just removes its only
          connection to the database, which starves the database of traffic entirely rather than overwhelming it —
          a reminder that in this simplified topology, removing a node is not the same experiment as failing it.)
          Netflix is well known for <strong>chaos engineering</strong>: deliberately breaking parts of its own
          production systems (its Chaos Monkey tooling) to prove the rest keeps working when a dependency fails.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          A global CDN (Open Connect), an{" "}
          <Link href="/technologies/nginx" className="text-sky-400 hover:text-sky-300">API gateway</Link>, many
          microservices,{" "}
          <Link href="/technologies/redis" className="text-sky-400 hover:text-sky-300">caches</Link>, and
          high-write-throughput stores like Cassandra for playback data.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>Point the player at edge URLs, and let cache headers keep the CDN full:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// the manifest hands the player CDN segment URLs, not origin URLs
GET /watch/{title}/manifest
  → { segments: ["https://edge.cdn/.../seg1.ts", ...], bitrates: [...] }

// origin marks video segments as long-lived + unchanging so edges cache them
Cache-Control: public, max-age=31536000, immutable

// metadata is just a cache-aside API behind the same edge:
// check the cache first, and only query the database on a miss
GET /api/title/{id}   → CDN → (miss) gateway → service → cache → db`}
        </pre>
        <p>The engineering goal is a high edge hit ratio — every percentage point shifted off the origin is a real cost and latency win.</p>
      </Section>

      <Section title="11. Alternatives & Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Edge caching vs origin compute — more edge means lower latency and lower cost, but it&rsquo;s harder to keep personalized recommendations perfectly fresh.</li>
          <li>Pre-positioning content ahead of demand (predicting what a region will want) vs filling the CDN on-demand as requests come in.</li>
          <li>Microservices give flexibility to scale and deploy each piece independently, at the cost of real operational complexity (more services to monitor, deploy, and debug).</li>
        </ul>
      </Section>
    </main>
  );
}
