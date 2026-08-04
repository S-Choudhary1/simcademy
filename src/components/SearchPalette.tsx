"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { TECHNOLOGIES, CONCEPTS, COMPARISONS } from "@/content/catalog";
import { ARCHITECTURES } from "@/sim/architectures";

interface Item { label: string; href: string; group: string; blurb: string }

const INDEX: Item[] = [
  { label: "Playground", href: "/playground", group: "Page", blurb: "Build a system and run traffic through it" },
  { label: "About", href: "/about", group: "Page", blurb: "What Simcademy is" },
  { label: "Contact", href: "/contact", group: "Page", blurb: "Get in touch" },
  ...TECHNOLOGIES.map((t) => ({ label: t.name, href: `/technologies/${t.slug}`, group: "Technology", blurb: t.blurb })),
  ...CONCEPTS.map((c) => ({ label: c.name, href: `/concepts/${c.slug}`, group: "Concept", blurb: c.blurb })),
  ...ARCHITECTURES.map((a) => ({ label: a.name, href: `/architectures/${a.slug}`, group: "Architecture", blurb: a.blurb })),
  ...COMPARISONS.map((c) => ({ label: c.name, href: `/comparisons/${c.slug}`, group: "Comparison", blurb: c.blurb })),
];

const GROUP_COLOR: Record<string, string> = {
  Page: "text-slate-400",
  Technology: "text-emerald-400",
  Concept: "text-fuchsia-400",
  Architecture: "text-teal-400",
  Comparison: "text-orange-400",
};

export function SearchPalette() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return INDEX.slice(0, 8);
    return INDEX.filter((i) => i.label.toLowerCase().includes(query) || i.blurb.toLowerCase().includes(query) || i.group.toLowerCase().includes(query)).slice(0, 12);
  }, [q]);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
  }, []);

  const go = useCallback(
    (item: Item) => {
      close();
      router.push(item.href);
    },
    [close, router],
  );

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!mounted) return null;

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-sm text-slate-400 hover:border-slate-700 hover:text-slate-200"
      aria-label="Search"
    >
      <span>🔍</span>
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">⌘K</kbd>
    </button>
  );

  const modal = open
    ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
              }}
              placeholder="Search technologies, concepts, architectures…"
              className="w-full border-b border-slate-800 bg-transparent px-4 py-3.5 text-[15px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">No matches for &ldquo;{q}&rdquo;.</p>
              ) : (
                results.map((item, i) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => go(item)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${i === active ? "bg-slate-800" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-slate-100">{item.label}</span>
                      <span className="block truncate text-[12px] text-slate-500">{item.blurb}</span>
                    </span>
                    <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${GROUP_COLOR[item.group] ?? "text-slate-500"}`}>{item.group}</span>
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2 text-[11px] text-slate-600">
              <span>↑↓ navigate · ↵ open · esc close</span>
              <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {trigger}
      {modal}
    </>
  );
}
