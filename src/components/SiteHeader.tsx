"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SearchPalette } from "./SearchPalette";

const NAV = [
  { href: "/technologies", label: "Technologies" },
  { href: "/concepts", label: "Concepts" },
  { href: "/architectures", label: "Architectures" },
  { href: "/comparisons", label: "Comparisons" },
  { href: "/playground", label: "Playground" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
        <Link href="/" aria-label="Simcademy home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 text-sm md:flex">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 transition ${
                  active ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SearchPalette />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-slate-100 md:hidden"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="border-t border-slate-800 bg-slate-950 px-4 py-2 md:hidden">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-md px-3 py-2.5 text-[15px] ${
                  active ? "bg-slate-800 text-slate-100" : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
