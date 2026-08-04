import Link from "next/link";
import type { Metadata } from "next";
import { CONCEPTS } from "@/content/catalog";
import { ConceptLab } from "@/concepts/ConceptLab";

export const metadata: Metadata = {
  title: "Concepts",
  description:
    "Core distributed-systems concepts explained with purpose-built interactive visualizations: CAP, ACID, BASE, CQRS, Saga, Consistent Hashing, Circuit Breaker, Rate Limiting, and the Transactional Outbox.",
};

export default function ConceptsIndex() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Concepts</h1>
        <p className="mt-2 text-slate-400">
          The ideas behind the systems — each with a purpose-built interactive visualization.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Concept playground</h2>
        <p className="mb-3 text-sm text-slate-400">Run any concept&rsquo;s interactive simulator right here, then open its full lesson.</p>
        <ConceptLab />
      </section>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">All concepts</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONCEPTS.map((c) => (
          <Link
            key={c.slug}
            href={`/concepts/${c.slug}`}
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-fuchsia-500/50 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{c.name}</span>
              <span className="text-slate-600 transition group-hover:text-fuchsia-300">→</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-400">{c.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
