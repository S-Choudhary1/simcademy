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
          Show each user a personalized timeline of posts from everyone they follow — instantly, for huge numbers of
          people — where far more people are scrolling (reading) than posting (writing). The trick is to do the
          expensive work <strong>when someone posts</strong>, not <strong>when someone reads</strong>, since reads
          happen far more often than posts.
        </p>
      </Section>

      <Section title="2. Fan-out on write vs on read">
        <p>
          <strong>Fan-out on read</strong> builds the timeline at read time: when you open the app, the system looks
          up everyone you follow, fetches their recent posts, and merges and sorts them on the spot. Simple to build,
          but every single scroll triggers a big, expensive query — that gets brutal at scale.
        </p>
        <p>
          <strong>Fan-out on write</strong> flips the order: the expensive work happens once, right when a post is
          created. The system immediately pushes (&ldquo;fans out&rdquo;) that new post into a separate, precomputed
          feed for every one of the poster&rsquo;s followers — commonly a{" "}
          <Link href="/technologies/redis" className="text-sky-400 hover:text-sky-300">Redis</Link> list, a simple
          ordered list kept per user. Reading your feed then just means fetching that already-built list — a cheap,
          already-computed read, not a live computation done on the spot. This simulation models that read path.
        </p>
      </Section>

      <Section title="3. Interactive simulation">
        <p>
          Users → API Gateway → Feed Service → <strong>Feed Cache</strong> → Postgres. Because feeds are precomputed
          at write time, nearly all reads are cache hits and the database barely sees any traffic. Raise the load
          below and watch the cache absorb it — the database only gets involved on a cache miss (a cold or evicted
          feed).
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="4. The celebrity problem">
        <p>
          Fan-out on write breaks down for accounts with tens of millions of followers — one post from them would
          trigger tens of millions of feed-list writes all at once. The standard fix is a{" "}
          <strong>hybrid</strong> approach: fan out on write for ordinary users, but for celebrity accounts, skip the
          push entirely. Instead, pull their recent posts at read time and merge them into the follower&rsquo;s
          otherwise-precomputed feed. This keeps reads cheap for the common case while keeping write cost bounded for
          the rare outliers.
        </p>
      </Section>

      <Section title="5. Key decisions">
        <ul className="list-disc space-y-1 pl-5">
          <li>Precompute feeds with fan-out on write, so the hot path — reading — is a cache hit, not a live computation.</li>
          <li>Store each user&rsquo;s timeline as a Redis list, capped to the most recent N posts to bound memory use.</li>
          <li>Do the fan-out asynchronously, via a <Link href="/technologies/kafka" className="text-sky-400 hover:text-sky-300">queue</Link>, so creating a post stays fast even though delivering it to every follower takes longer.</li>
          <li>Use hybrid fan-out (push for most users, pull for celebrities) so one viral account can&rsquo;t overload the write path.</li>
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
