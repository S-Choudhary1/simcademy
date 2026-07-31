import Link from "next/link";
import { COMPARISONS, CONCEPTS, TECHNOLOGIES, type CatalogItem } from "@/content/catalog";
import { ARCHITECTURES } from "@/sim/architectures";
import { MemeShuffle } from "@/components/memes";

const ARCH_ITEMS: CatalogItem[] = ARCHITECTURES.map((a) => ({ slug: a.slug, name: a.name, blurb: a.blurb }));

function CardGrid({
  items,
  base,
  tag,
  accent,
}: {
  items: CatalogItem[];
  base: string;
  tag: string;
  accent: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <Link
          key={it.slug}
          href={`${base}/${it.slug}`}
          className={`group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:bg-slate-900 ${accent}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-100">{it.name}</span>
            <span className="text-slate-600 transition group-hover:text-slate-300">{tag}</span>
          </div>
          <p className="mt-1.5 text-sm text-slate-400">{it.blurb}</p>
        </Link>
      ))}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">Explore Real-World Systems</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          See how production systems work. Explore, modify, and break them safely.
        </p>
        <p className="mt-3 text-sm text-slate-600">Crash the simulator, not production.™</p>
        <div className="mt-6">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Open the Simulator Playground →
          </Link>
        </div>
        <div className="mx-auto mt-10 max-w-xl text-left">
          <MemeShuffle />
        </div>
      </section>

      <section className="mt-14">
        <Heading>Technologies</Heading>
        <CardGrid items={TECHNOLOGIES} base="/technologies" tag="Interactive →" accent="hover:border-emerald-500/50" />
      </section>

      <section className="mt-12">
        <Heading>Concepts</Heading>
        <CardGrid items={CONCEPTS} base="/concepts" tag="Visualized →" accent="hover:border-fuchsia-500/50" />
      </section>

      <section className="mt-12">
        <Heading>Architectures</Heading>
        <CardGrid items={ARCH_ITEMS} base="/architectures" tag="Explore →" accent="hover:border-teal-500/50" />
      </section>

      <section className="mt-12">
        <Heading>Comparisons</Heading>
        <CardGrid items={COMPARISONS} base="/comparisons" tag="Compare →" accent="hover:border-orange-500/50" />
      </section>
    </main>
  );
}
