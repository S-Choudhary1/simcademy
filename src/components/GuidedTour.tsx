"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

/* ================================================================== *
 * GuidedTour — a small, dependency-free product tour. Spotlights a
 * target element, shows a tooltip explaining it, and steps through a
 * list. Remembers "seen" per tourId; re-runnable via the 🎓 button.
 *
 * A step with no `target` renders a centered modal (intro/outro).
 * A step whose target isn't on the page is skipped automatically.
 * ================================================================== */

export interface TourStep {
  target?: string; // CSS selector; omit for a centered card
  title: string;
  body: string;
}

const TIP_W = 330;
const PAD = 8;

export function GuidedTour({ tourId, steps, autoStart = true }: { tourId: string; steps: TourStep[]; autoStart?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // resolve the visible steps (drop steps whose target is missing) when starting
  const start = useCallback(() => setActive(0), []);
  const finish = useCallback(() => {
    setActive(null);
    setRect(null);
    try {
      window.localStorage.setItem(`tour:${tourId}`, "done");
    } catch {
      /* ignore */
    }
  }, [tourId]);

  // auto-start once per visitor
  useEffect(() => {
    if (!mounted || !autoStart) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(`tour:${tourId}`) === "done";
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = window.setTimeout(() => setActive(0), 700);
    return () => window.clearTimeout(t);
  }, [mounted, autoStart, tourId]);

  const step = active !== null ? steps[active] : null;

  // advance past a step whose target has vanished
  const go = useCallback(
    (dir: 1 | -1) => {
      setActive((cur) => {
        if (cur === null) return cur;
        let next = cur + dir;
        while (next >= 0 && next < steps.length) {
          const t = steps[next].target;
          if (!t || document.querySelector(t)) return next;
          next += dir;
        }
        if (next >= steps.length) {
          finish();
          return null;
        }
        return cur;
      });
    },
    [steps, finish],
  );

  // measure current target + keep it in sync with scroll/resize
  useLayoutEffect(() => {
    if (active === null) return;
    const sel = steps[active]?.target;
    const el = sel ? document.querySelector(sel) : null;
    if (!el) {
      const raf = requestAnimationFrame(() => setRect(null)); // deferred: avoids sync setState in effect
      return () => cancelAnimationFrame(raf);
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    const measure = () => setRect(el.getBoundingClientRect());
    const raf = requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 320); // after smooth scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, steps]);

  // keyboard controls
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go, finish]);

  if (!mounted) return null;

  const trigger = (
    <button
      type="button"
      onClick={start}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-slate-900/90 px-3.5 py-2 text-sm font-medium text-sky-300 shadow-lg backdrop-blur hover:bg-slate-800"
    >
      🎓 <span className="hidden sm:inline">Take the tour</span>
    </button>
  );

  const overlay =
    step !== null
      ? createPortal(
          <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Guided tour">
            {/* click catcher */}
            <div className="absolute inset-0" onClick={() => go(1)} />
            {/* dim: spotlight cutout when we have a rect, else a flat scrim */}
            {rect ? (
              <div
                className="pointer-events-none absolute rounded-lg ring-2 ring-sky-400 transition-all duration-200"
                style={{
                  top: rect.top - PAD,
                  left: rect.left - PAD,
                  width: rect.width + PAD * 2,
                  height: rect.height + PAD * 2,
                  boxShadow: "0 0 0 9999px rgba(2,6,23,0.72)",
                }}
              />
            ) : (
              <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(2,6,23,0.72)" }} />
            )}
            {/* tooltip */}
            <TourCard rect={rect} index={active!} total={steps.length} step={step} onNext={() => go(1)} onBack={() => go(-1)} onSkip={finish} />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {overlay}
    </>
  );
}

function TourCard({
  rect,
  index,
  total,
  step,
  onNext,
  onBack,
  onSkip,
}: {
  rect: DOMRect | null;
  index: number;
  total: number;
  step: TourStep;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  // position: below the target if there's room, else above; else centered
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const centered = !rect;
  let pos: React.CSSProperties;
  if (centered) {
    pos = { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: Math.min(TIP_W, vw - 24) };
  } else {
    const spaceBelow = vh - rect.bottom;
    const top = spaceBelow > 200 ? rect.bottom + 14 : Math.max(14, rect.top - 210);
    const left = Math.min(Math.max(12, rect.left), vw - TIP_W - 12);
    pos = { top, left, width: TIP_W };
  }

  const isLast = index === total - 1;

  return (
    <div className="absolute rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl" style={pos} onClick={(e) => e.stopPropagation()}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-sky-400">Step {index + 1} of {total}</span>
        <button type="button" onClick={onSkip} className="text-[11px] text-slate-500 hover:text-slate-300">Skip ✕</button>
      </div>
      <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
      <p className="mt-1 text-[13px] leading-snug text-slate-300">{step.body}</p>
      {/* progress dots */}
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-sky-400" : "w-1.5 bg-slate-700"}`} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={onBack} disabled={index === 0} className="rounded-md px-2.5 py-1 text-[13px] font-medium text-slate-400 hover:text-slate-200 disabled:opacity-30">← Back</button>
        <button type="button" onClick={onNext} className="rounded-md bg-sky-500 px-3.5 py-1.5 text-[13px] font-semibold text-slate-950 hover:bg-sky-400">
          {isLast ? "Done ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}
