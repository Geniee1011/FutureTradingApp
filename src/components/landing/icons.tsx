/** Line icons used across the landing page. All inherit `currentColor`. */

type P = { className?: string };

const base = "h-full w-full";

export function IconCheck({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  );
}

export function IconArrowRight({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconArrowUpRight({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function IconUsers({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20 19v-1.4a3.4 3.4 0 0 0-2.6-3.3M15.5 5.2a3.2 3.2 0 0 1 0 5.6" />
    </svg>
  );
}

export function IconMedal({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="12" cy="9" r="5.2" />
      <path d="m9 13.6-1.4 6.4L12 18l4.4 2-1.4-6.4" />
    </svg>
  );
}

export function IconClock({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 1.8" />
    </svg>
  );
}

export function IconInfinity({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M7 8.5a3.5 3.5 0 1 0 0 7c2.4 0 3.4-1.8 5-3.5 1.6-1.7 2.6-3.5 5-3.5a3.5 3.5 0 1 1 0 7c-2.4 0-3.4-1.8-5-3.5C10.4 10.3 9.4 8.5 7 8.5Z" />
    </svg>
  );
}

export function IconStar({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? base} aria-hidden>
      <path d="m12 3.6 2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85Z" />
    </svg>
  );
}

export function IconQuote({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? base} aria-hidden>
      <path d="M9.5 6.5c-3 1.3-4.8 3.7-4.8 6.6 0 2.6 1.5 4.4 3.7 4.4 1.9 0 3.3-1.4 3.3-3.2 0-1.7-1.2-3-2.9-3-.3 0-.6 0-.8.1.4-1.4 1.6-2.7 3.2-3.5l-1.7-1.4Zm8.4 0c-3 1.3-4.8 3.7-4.8 6.6 0 2.6 1.5 4.4 3.7 4.4 1.9 0 3.3-1.4 3.3-3.2 0-1.7-1.2-3-2.9-3-.3 0-.6 0-.8.1.4-1.4 1.6-2.7 3.2-3.5l-1.7-1.4Z" />
    </svg>
  );
}

export function IconInfo({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className ?? base} aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.2" strokeLinecap="round" />
      <circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconDiamond({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? base} aria-hidden>
      <path d="m12 3 9 9-9 9-9-9 9-9Z" />
    </svg>
  );
}

export const STAT_ICONS = {
  users: IconUsers,
  medal: IconMedal,
  clock: IconClock,
  infinity: IconInfinity,
} as const;
