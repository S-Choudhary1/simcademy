import Link from "next/link";
import type { Metadata } from "next";
import { TECHNOLOGIES } from "@/content/catalog";

export const metadata: Metadata = {
  title: "Technologies",
  description:
    "Interactive, browser-based simulations of core backend technologies — Kafka, Redis, PostgreSQL, MongoDB, RabbitMQ, and Nginx — each explorable at Beginner, Intermediate, and Advanced depth.",
};

export default function TechnologiesIndex() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Technologies</h1>
        <p className="mt-2 text-slate-400">
          Explore each technology as a live simulation at Beginner, Intermediate, and Advanced depth.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {TECHNOLOGIES.map((t) => (
          <Link
            key={t.slug}
            href={`/technologies/${t.slug}`}
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-emerald-500/50 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{t.name}</span>
              <span className="text-slate-600 transition group-hover:text-emerald-300">→</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-400">{t.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
