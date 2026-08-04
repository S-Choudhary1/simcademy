"use client";

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
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
        <Link href="/" aria-label="Simcademy home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
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
        <div className="ml-auto shrink-0">
          <SearchPalette />
        </div>
      </div>
    </header>
  );
}
