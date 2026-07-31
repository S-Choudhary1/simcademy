import Link from "next/link";
import type { Metadata } from "next";
import { ARCHITECTURES } from "@/sim/architectures";

export const metadata: Metadata = {
  title: "Architectures",
  description:
    "Real-world system designs you can run: URL Shortener, WhatsApp/Chat, Netflix, Payment Gateway, News Feed, and Typeahead — each an interactive architecture simulation with a full design breakdown.",
};

export default function ArchitecturesIndex() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Architectures</h1>
        <p className="mt-2 text-slate-400">
          Real-world systems, each a runnable architecture with a full design breakdown.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {ARCHITECTURES.map((a) => (
          <Link
            key={a.slug}
            href={`/architectures/${a.slug}`}
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-teal-500/50 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{a.name}</span>
              <span className="text-slate-600 transition group-hover:text-teal-300">→</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-400">{a.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
