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
          Suggest completions as the user types — in under about 100 milliseconds — for millions of people typing at
          once. The catch: every keystroke can trigger a request, so a single search box can generate more traffic
          than the rest of the site combined. The whole architecture is really about{" "}
          <strong>avoiding real work on most keystrokes</strong>.
        </p>
      </Section>

      <Section title="2. Two levers: debounce + cache">
        <p>
          First, the client <strong>debounces</strong> — instead of sending a request on every single keystroke, it
          waits for a short pause in typing before sending one. That collapses &ldquo;p&rdquo;, &ldquo;pi&rdquo;,
          &ldquo;piz&rdquo;, &ldquo;pizz&rdquo;, &ldquo;pizza&rdquo; into just one or two requests instead of five.
        </p>
        <p>
          Second, the server keeps a <strong>prefix cache</strong> — a cache keyed by whatever has been typed so far.
          A popular prefix like &ldquo;piz&rdquo; returns the same top-10 suggestions for every user, so it&rsquo;s
          cached once and reused constantly, giving a very high hit rate. Only a cache miss ever reaches the full
          search index.
        </p>
      </Section>

      <Section title="3. Interactive simulation">
        <p>
          Keystrokes → <strong>API Gateway</strong>{" "}(a single front door that routes each request to the right
          backend service) → Autocomplete Service → <strong>Prefix Cache</strong> → Search Index. Because popular
          prefixes repeat across users, most queries are cache hits served in under a millisecond — only the long
          tail of rare prefixes reaches the (trie / inverted-index) search backend. Push the keystroke rate up below
          and watch the cache absorb it.
        </p>
        <EmbeddedSim blueprint={arch.blueprint} />
      </Section>

      <Section title="4. How the suggestions are built">
        <p>
          The index is usually a <strong>trie</strong>{" "}(a tree where every path from the root spells out a prefix,
          one letter at a time), where each node already stores the top-K completions for that prefix. That means a
          lookup is just a short walk down the tree — no ranking happens at query time. The trie is rebuilt offline
          from search logs (weighted by how often each suggestion gets picked), then loaded fully into memory.
          That&rsquo;s why suggestions feel instant: the actual ranking work happened hours earlier, not on your
          keystroke.
        </p>
      </Section>

      <Section title="5. Key decisions">
        <ul className="list-disc space-y-1 pl-5">
          <li>Debounce on the client to cut request volume before it ever reaches the server.</li>
          <li>Cache by prefix — popular prefixes are shared across all users, so a small cache serves a huge share of traffic.</li>
          <li>Precompute the top-K suggestions per prefix offline (in a trie), so query time is a lookup, not a live search.</li>
          <li>Serve stale-but-fast: a suggestion list that&rsquo;s a few hours out of date is a fine trade for an instant response.</li>
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
