import Link from "next/link";
import type { Metadata } from "next";
import { EmbeddedSim } from "@/sim/ui/EmbeddedSim";
import { ARCH_BY_SLUG } from "@/sim/architectures";

export const metadata: Metadata = {
  title: "Typeahead / Autocomplete — Architecture",
  description:
    "How search autocomplete scales: every keystroke is a query, so a prefix cache absorbs the hot prefixes and a trie-backed search index handles the rest. Debouncing, prefix caching, and an interactive simulation.",
  keywords: ["typeahead architecture", "autocomplete", "search suggestions", "prefix cache", "trie", "debounce", "system design", "Elasticsearch", "Redis"],
};

const arch = ARCH_BY_SLUG["typeahead"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-slate-800 py-7 first:border-t-0">
      <h2 className="mb-3 text-xl font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function TypeaheadPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">Home</Link>{" "}
        / <span className="text-slate-400">Architectures</span> / <span className="text-slate-300">Typeahead / Autocomplete</span>
      </nav>

      <header className="mb-6">
        <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">Architecture</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">Typeahead / Autocomplete</h1>
        <p className="mt-2 text-slate-400">{arch.blurb}</p>
      </header>

      <Section title="1. Business problem">
        <p>
          Suggest completions as the user types, in under ~100ms, for millions of concurrent typers. The catch: every
          keystroke is potentially a request, so a single search box can generate more queries than the rest of the site
          combined. The whole architecture is about <strong>not doing real work most of the time</strong>.
        </p>
      </Section>

      <Section title="2. Two levers: debounce + cache">
        <p>
          First, the client <strong>debounces</strong> — it waits for a short pause in typing before sending, collapsing
          &ldquo;p&rdquo;, &ldquo;pi&rdquo;, &ldquo;piz&rdquo;, &ldquo;pizz&rdquo;, &ldquo;pizza&rdquo; into one or two
          requests. Second, the server keeps a <strong>prefix cache</strong>: popular prefixes (&ldquo;piz&rdquo; →
          top 10 suggestions) are the same for everyone, so they&rsquo;re cached with a very high hit rate. Only a cache
          miss reaches the search index.
        </p>
      </Section>

      <Section title="3. Interactive simulation">
        <p>
          Keystrokes → API Gateway → Autocomplete Service → <strong>Prefix Cache</strong> → Search Index. Because
          popular prefixes repeat across users, ~90% of queries are cache hits served in a millisecond; only the long
          tail hits the (trie / inverted-index) search backend. Push the keystroke rate up and watch the cache soak it.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="4. How the suggestions are built">
        <p>
          The index is usually a <strong>trie</strong> (prefix tree) where each node stores the top-K completions for
          that prefix, so a lookup is a short walk down the tree — no ranking at query time. It&rsquo;s rebuilt offline
          from search logs (weighted by popularity), then loaded into memory. That&rsquo;s why suggestions feel instant:
          the ranking work happened hours ago, not on your keystroke.
        </p>
      </Section>

      <Section title="5. Key decisions">
        <ul className="list-disc space-y-1 pl-5">
          <li>Debounce on the client to cut request volume at the source.</li>
          <li>Cache by prefix — popular prefixes are shared across all users, so hit rates are very high.</li>
          <li>Precompute top-K per prefix offline (a trie) so query time is a lookup, not a search.</li>
          <li>Serve stale-but-fast: a slightly out-of-date suggestion list is fine.</li>
        </ul>
      </Section>

      <Section title="Related">
        <p className="flex flex-wrap gap-2">
          <Link href="/architectures/url-shortener" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">URL Shortener</Link>
          <Link href="/technologies/redis" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Redis</Link>
          <Link href="/concepts/postgresql-indexing" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Indexing</Link>
          <Link href="/playground" className="rounded-md bg-slate-800 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700">Open in Playground</Link>
        </p>
      </Section>
    </main>
  );
}
