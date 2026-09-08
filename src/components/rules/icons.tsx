/** Group icons for the rules page. All inherit `currentColor`. */

type P = { className?: string };
const base = "h-full w-full";

export function IconBook({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M12 6.6C10.6 5.5 8.8 5 6.6 5H4v12.6h2.6c2.2 0 4 .5 5.4 1.6 1.4-1.1 3.2-1.6 5.4-1.6H20V5h-2.6c-2.2 0-4 .5-5.4 1.6Z" />
      <path d="M12 6.6v12.6" />
    </svg>
  );
}

export function IconScales({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M12 4.4v15.2M7 19.6h10M5 7.6h14M12 7.6 5 7.2" />
      <path d="M5 7.4 2.8 13h4.4L5 7.4ZM19 7.4 16.8 13h4.4L19 7.4Z" />
    </svg>
  );
}

export function IconCard({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <rect x="3" y="5.6" width="18" height="12.8" rx="2.2" />
      <path d="M3 10h18M6.6 14.6h3" />
    </svg>
  );
}

export function IconShield({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M12 3.2 5.4 6v5.3c0 4 2.8 7.7 6.6 9.5 3.8-1.8 6.6-5.5 6.6-9.5V6L12 3.2Z" />
      <path d="M12 8.4v4.2" />
      <circle cx="12" cy="15.6" r=".9" fill="currentColor" stroke="none" />
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

export const GROUP_ICONS = {
  book: IconBook,
  scales: IconScales,
  card: IconCard,
  shield: IconShield,
} as const;
