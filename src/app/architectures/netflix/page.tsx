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
          Stream video to hundreds of millions of viewers worldwide with instant start and no buffering, while keeping
          origin infrastructure and bandwidth costs sane. The answer is to serve almost everything from the{" "}
          <strong>edge</strong>, close to the user.
        </p>
      </Section>

      <Section title="2. Functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Browse the catalog and get personalized recommendations (metadata API).</li>
          <li>Stream video segments with adaptive bitrate.</li>
          <li>Track playback position and history.</li>
        </ul>
      </Section>

      <Section title="3. Non-functional Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>Instant playback start; smooth streaming under varying networks.</li>
          <li>Global scale with regional resilience.</li>
          <li>Origin protected from the full request volume — the edge takes the load.</li>
        </ul>
      </Section>

      <Section title="4. Interactive Architecture">
        <p>
          The CDN edge serves ~95% of requests directly; only misses flow to the API gateway, services, cache, and
          database. Watch how little traffic reaches the origin — then drop the CDN hit ratio and see the origin light
          up.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="5. Request Flow">
        <p>
          Video: the player requests segments from the nearest edge server (Netflix&rsquo;s Open Connect appliances),
          which almost always has them cached. Metadata: browse/recommendation calls go through the CDN too, falling
          back to the origin API stack (gateway → services → cache → database) on a miss.
        </p>
      </Section>

      <Section title="6. Component Deep Dive">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>CDN edge</strong> — pre-positioned video and cached responses close to users; the single biggest lever.</li>
          <li><strong>API gateway + services</strong> — the origin, only touched on cache misses and dynamic calls.</li>
          <li><strong>Cache + database</strong> — back the services for metadata, profiles, and playback state.</li>
        </ul>
      </Section>

      <Section title="7. Scaling Strategy">
        <p>
          Scale by pushing more content and logic to the edge: higher CDN hit ratios shrink origin load. The origin
          scales like any web stack — stateless services behind a gateway, cache in front of the database, read
          replicas for metadata.
        </p>
      </Section>

      <Section title="8. Failure Handling">
        <p>
          Lower the CDN hit ratio (or kill the origin cache) to watch the origin get overwhelmed — this is why edge
          resilience and graceful degradation matter. Netflix famously uses chaos engineering to prove services
          survive dependency failures.
        </p>
      </Section>

      <Section title="9. Technology Choices">
        <p>
          A global CDN (Open Connect), an{" "}
          <Link href="/technologies/nginx" className="text-sky-400 hover:text-sky-300">API gateway</Link>, many
          microservices,{" "}
          <Link href="/technologies/redis" className="text-sky-400 hover:text-sky-300">caches</Link>, and stores like
          Cassandra for high-write playback data.
        </p>
      </Section>

      <Section title="10. How to build it">
        <p>Point the player at edge URLs, and let cache headers keep the CDN full:</p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[13px] text-slate-300">
{`// the manifest hands the player CDN segment URLs, not origin URLs
GET /watch/{title}/manifest
  → { segments: ["https://edge.cdn/.../seg1.ts", ...], bitrates: [...] }

// origin marks video segments as long-lived + immutable so edges cache them
Cache-Control: public, max-age=31536000, immutable

// metadata is just a cache-aside API behind the same edge
GET /api/title/{id}   → CDN → (miss) gateway → service → cache → db`}
        </pre>
        <p>The engineering goal is a high edge hit ratio — every percent off the origin is a big cost and latency win.</p>
      </Section>

      <Section title="11. Alternatives & Trade-offs">
        <ul className="list-disc space-y-1 pl-5">
          <li>Edge caching vs origin compute — more edge means lower latency and cost, but weaker personalization freshness.</li>
          <li>Pre-positioning content (predictive) vs on-demand fill of the CDN.</li>
          <li>Microservices&rsquo; flexibility vs the operational complexity they add.</li>
        </ul>
      </Section>
    </main>
  );
}
