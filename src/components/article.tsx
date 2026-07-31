import Link from "next/link";
import type { ReactNode } from "react";

/* ================================================================== *
 * Long-form article primitives — a clean, readable, Medium-style
 * reading experience for comparison / explainer pages. Dark-theme,
 * ~680px measure, generous line-height, quiet links.
 * ================================================================== */

export function Article({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[720px] px-5 py-12 sm:py-16">{children}</main>;
}

export function Breadcrumb({ section, sectionHref, title }: { section: string; sectionHref: string; title: string }) {
  return (
    <nav className="mb-8 text-sm text-slate-500">
      <Link href="/" className="hover:text-slate-300">Home</Link> /{" "}
      <Link href={sectionHref} className="hover:text-slate-300">{section}</Link> /{" "}
      <span className="text-slate-400">{title}</span>
    </nav>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-orange-300">{children}</div>;
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-[2.4rem] font-extrabold leading-[1.1] tracking-tight text-slate-50 sm:text-5xl">{children}</h1>;
}

export function Dek({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-xl leading-relaxed text-slate-400">{children}</p>;
}

export function Meta({ read, tag }: { read: string; tag?: string }) {
  return (
    <div className="mt-5 flex items-center gap-3 border-b border-slate-800 pb-6 text-[13px] text-slate-500">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/30 to-fuchsia-500/30 text-sm">◆</span>
      <span>Simcademy</span>
      <span className="text-slate-700">·</span>
      <span>{read}</span>
      {tag ? (<><span className="text-slate-700">·</span><span>{tag}</span></>) : null}
    </div>
  );
}

/** The "A vs B (vs C)" hero cards. */
export function Versus({ sides }: { sides: { name: string; tag: string; color: string; icon: string }[] }) {
  return (
    <div className={`my-8 grid gap-3 ${sides.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {sides.map((s) => (
        <div key={s.name} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4" style={{ boxShadow: `inset 3px 0 0 ${s.color}` }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{s.icon}</span>
            <span className="font-semibold text-slate-100">{s.name}</span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-slate-400">{s.tag}</p>
        </div>
      ))}
    </div>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return <p className="mt-8 text-[19px] leading-[1.75] text-slate-200">{children}</p>;
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return <h2 id={id} className="mt-12 scroll-mt-20 text-[1.65rem] font-bold leading-tight tracking-tight text-slate-100">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-[17px] leading-[1.8] text-slate-300">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-5 space-y-2 pl-5 text-[17px] leading-[1.7] text-slate-300 [&>li]:list-disc [&>li]:pl-1 marker:text-slate-600">{children}</ul>;
}

export function Callout({ title = "The short version", children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="my-8 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-300">{title}</div>
      <div className="text-[16px] leading-relaxed text-slate-300">{children}</div>
    </aside>
  );
}

export function PullQuote({ children }: { children: ReactNode }) {
  return <blockquote className="my-9 border-l-2 border-sky-500/60 pl-5 text-[22px] font-medium italic leading-snug text-slate-200">{children}</blockquote>;
}

/** A figure that can break out wider than the text column (for a live sim). */
export function Figure({ wide = false, caption, children }: { wide?: boolean; caption?: string; children: ReactNode }) {
  return (
    <figure className="my-9">
      <div className={wide ? "relative left-1/2 w-[min(1080px,94vw)] -translate-x-1/2" : ""}>{children}</div>
      {caption ? <figcaption className="mt-3 text-center text-[13px] text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

/** Styled comparison table with N columns. */
export function CompareTable({ columns, rows }: { columns: string[]; rows: { feature: string; values: ReactNode[] }[] }) {
  return (
    <div className="my-8 overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[520px] border-collapse text-[14px]">
        <thead>
          <tr className="bg-slate-900">
            <th className="px-4 py-3 text-left font-semibold text-slate-500"> </th>
            {columns.map((c) => (<th key={c} className="px-4 py-3 text-left font-semibold text-slate-100">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.feature} className={i % 2 ? "bg-slate-900/30" : ""}>
              <td className="border-t border-slate-800 px-4 py-3 font-medium text-slate-400">{r.feature}</td>
              {r.values.map((v, j) => (<td key={j} className="border-t border-slate-800 px-4 py-3 text-slate-300">{v}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Choose X when…" decision cards. */
export function ChooseWhen({ options }: { options: { name: string; color: string; points: string[] }[] }) {
  return (
    <div className={`my-8 grid gap-3 ${options.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {options.map((o) => (
        <div key={o.name} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-2 font-semibold" style={{ color: o.color }}>Choose {o.name} when…</div>
          <ul className="space-y-1.5 text-[14px] leading-snug text-slate-300">
            {o.points.map((p, i) => (<li key={i} className="flex gap-2"><span style={{ color: o.color }}>▸</span><span>{p}</span></li>))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Related({ links }: { links: { href: string; label: string }[] }) {
  return (
    <div className="mt-12 border-t border-slate-800 pt-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Keep reading</div>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">{l.label}</Link>
        ))}
      </div>
    </div>
  );
}

/** Inline link with a quiet underline, for use inside <P>. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 transition hover:decoration-sky-400">{children}</Link>;
}
