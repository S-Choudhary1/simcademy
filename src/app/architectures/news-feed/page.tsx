import Link from "next/link";
import type { Metadata } from "next";
import { EmbeddedSim } from "@/sim/ui/EmbeddedSim";
import { ARCH_BY_SLUG } from "@/sim/architectures";

export const metadata: Metadata = {
  title: "News Feed / Timeline — Architecture",
  description:
    "How a social news feed scales: fan-out on write precomputes each user's timeline into a cache, so the read path is a near-instant cache hit. Fan-out on write vs on read, the celebrity problem, and an interactive simulation.",
  keywords: ["news feed architecture", "timeline", "fan-out on write", "fan-out on read", "celebrity problem", "feed cache", "system design", "Redis"],
};

const arch = ARCH_BY_SLUG["news-feed"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function NewsFeedPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Architectures</span> / <span className="text-slate-300">News Feed / Timeline</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">Architecture</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">News Feed / Timeline</h1>
        <p className="mt-2 text-slate-400">{arch.blurb}</p>
      </header>

      <Section title="1. Business problem">
        <p>
          Show each user a personalized timeline of posts from everyone they follow, instantly, at massive scale — where
          reads vastly outnumber writes (people scroll far more than they post). The trick is to do the expensive work
          <strong> when someone posts</strong>, not <strong>when someone reads</strong>.
        </p>
      </Section>

      <Section title="2. Fan-out on write vs on read">
        <p>
          <strong>Fan-out on read</strong> builds the timeline at read time: query everyone you follow, merge, sort.
          Simple, but every scroll does a huge query — brutal at scale. <strong>Fan-out on write</strong> flips it: when
          you post, the system <em>pushes</em> that post into a precomputed feed for each of your followers (stored in a{" "}
          <Link href="/technologies/redis" className="text-sky-400 hover:text-sky-300">Redis</Link> list). Reads then just
          fetch a ready-made list — an O(1) cache hit. This simulation models that read path.
        </p>
      </Section>

      <Section title="3. Interactive simulation">
        <p>
          Users → API Gateway → Feed Service → <strong>Feed Cache</strong> → Postgres. Because feeds are precomputed on
          write, ~92% of reads are cache hits and the database barely moves. Raise the traffic and watch the cache absorb
          it; the DB only sees the misses (cold or evicted feeds).
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="4. The celebrity problem">
        <p>
          Fan-out on write breaks for accounts with tens of millions of followers: one post would trigger tens of
          millions of feed writes. The standard fix is a <strong>hybrid</strong> — fan out on write for normal users, but
          for celebrities <em>don&rsquo;t</em> push; instead pull their recent posts at read time and merge them into the
          precomputed feed. Best of both: cheap reads for the common case, bounded write cost for the outliers.
        </p>
      </Section>

      <Section title="5. Key decisions">
        <ul className="list-disc space-y-1 pl-5">
          <li>Precompute feeds with fan-out on write so the hot path (reading) is a cache hit.</li>
          <li>Store timelines in Redis lists, capped to the most recent N entries.</li>
          <li>Do fan-out asynchronously via a <Link href="/technologies/kafka" className="text-sky-400 hover:text-sky-300">queue</Link> so posting stays fast.</li>
          <li>Hybrid fan-out to survive celebrities.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/architectures/whatsapp" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">WhatsApp / Chat</Link>
          <Link href="/concepts/cqrs" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">CQRS</Link>
          <Link href="/technologies/redis" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Redis</Link>
          <Link href="/playground" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Open in Playground</Link>
        </p>
      </Section>
    </main>
  );
}
