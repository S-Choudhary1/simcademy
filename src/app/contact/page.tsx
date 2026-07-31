import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Simcademy — feedback, corrections, bug reports, and partnership enquiries.",
  alternates: { canonical: "/contact" },
};

const EMAIL = "hello@simcademy.app";

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-slate-50">Contact</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-slate-300">
        We&rsquo;d love to hear from you — whether it&rsquo;s feedback, a correction, a bug in a simulation, an idea for
        a concept you&rsquo;d like to see, or a partnership enquiry.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</div>
          <a href={`mailto:${EMAIL}`} className="mt-1 block text-lg font-medium text-sky-400 hover:text-sky-300">{EMAIL}</a>
          <p className="mt-2 text-[13px] leading-snug text-slate-500">We read every message and usually reply within a few days.</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Found a mistake?</div>
          <p className="mt-1 text-[15px] leading-snug text-slate-300">
            Accuracy matters to us. If a simulation or explanation looks wrong, tell us — include the page and what you
            expected, and we&rsquo;ll fix it.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <a href={`mailto:${EMAIL}`} className="inline-flex rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Email us →</a>
      </div>
    </main>
  );
}
