import Link from "next/link";
import { LogoMark } from "./Logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Learn",
    links: [
      { href: "/technologies", label: "Technologies" },
      { href: "/concepts", label: "Concepts" },
      { href: "/architectures", label: "Architectures" },
      { href: "/comparisons", label: "Comparisons" },
    ],
  },
  {
    title: "Product",
    links: [
      { href: "/playground", label: "Playground" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2" aria-label="Simcademy home">
            <LogoMark size={22} />
            <span className="font-bold tracking-tight text-slate-100">
              Sim<span className="text-sky-400">cademy</span>
            </span>
          </Link>
          <p className="mt-2 max-w-[220px] text-[13px] leading-snug text-slate-500">
            An interactive academy for system design. Explore, modify, and break real systems safely.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{col.title}</h3>
            <ul className="space-y-1.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-400 transition hover:text-slate-200">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[13px] text-slate-500 sm:flex-row">
          <span>© 2026 Simcademy. Crash the simulator, not production.™</span>
          <span>Built for learning system design.</span>
        </div>
      </div>
    </footer>
  );
}
