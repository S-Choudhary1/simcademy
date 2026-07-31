import Link from "next/link";
import type { Metadata } from "next";
import { COMPARISONS } from "@/content/catalog";

export const metadata: Metadata = {
  title: "Comparisons",
  description:
    "Side-by-side comparisons of competing technologies with live dual simulations and decision guides: Kafka vs RabbitMQ, PostgreSQL vs MongoDB.",
};

export default function ComparisonsIndex() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Comparisons</h1>
        <p className="mt-2 text-slate-400">
          Competing technologies, run side by side under the same traffic, with a decision guide.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {COMPARISONS.map((c) => (
          <Link
            key={c.slug}
            href={`/comparisons/${c.slug}`}
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-orange-500/50 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{c.name}</span>
              <span className="text-slate-600 transition group-hover:text-orange-300">→</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-400">{c.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
