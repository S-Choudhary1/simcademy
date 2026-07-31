/** Simcademy logo — a little request-flow graph mark + wordmark. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="7" fill="#0b1220" stroke="#1e293b" strokeWidth="1" />
      <g stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
        <line x1="8.5" y1="10" x2="16" y2="16" />
        <line x1="23.5" y1="10" x2="16" y2="16" />
        <line x1="16" y1="16" x2="16" y2="23.5" />
      </g>
      <circle cx="8.5" cy="9.5" r="3" fill="#38bdf8" />
      <circle cx="23.5" cy="9.5" r="3" fill="#38bdf8" />
      <circle cx="16" cy="16" r="3.6" fill="#34d399" />
      <circle cx="16" cy="24" r="3" fill="#a78bfa" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-base font-bold tracking-tight text-slate-100">
        Sim<span className="text-sky-400">cademy</span>
      </span>
    </span>
  );
}
