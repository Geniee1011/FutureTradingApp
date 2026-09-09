/** Icons for the rules page — group tiles and per-topic markers. */

type P = { className?: string };
const base = "h-full w-full";

/* ------------------------------ Groups ------------------------------ */

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
      <path d="M12 4.4v15.2M7 19.6h10M5 7.6h14" />
      <path d="M5 7.4 2.8 13h4.4L5 7.4ZM19 7.4 16.8 13h4.4L19 7.4Z" />
    </svg>
  );
}

export function IconCard({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <rect x="3" y="5.6" width="18" height="12.8" rx="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M6.4 12h.6M17 12h.6" />
    </svg>
  );
}

export function IconShieldAlert({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M12 3.2 5.4 6v5.3c0 4 2.8 7.7 6.6 9.5 3.8-1.8 6.6-5.5 6.6-9.5V6L12 3.2Z" />
      <path d="M12 8.4v4.2" />
      <circle cx="12" cy="15.6" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ------------------------------ Topics ------------------------------ */

export function IconDoc({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M14 3.4H7.2A1.8 1.8 0 0 0 5.4 5.2v13.6a1.8 1.8 0 0 0 1.8 1.8h9.6a1.8 1.8 0 0 0 1.8-1.8V8l-4.6-4.6Z" />
      <path d="M14 3.4V8h4.6M8.8 12.4h6.4M8.8 16h6.4" />
    </svg>
  );
}

export function IconCalculator({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <rect x="5" y="3.2" width="14" height="17.6" rx="2" />
      <path d="M8.4 7h7.2M8.6 11.4h.01M12 11.4h.01M15.4 11.4h.01M8.6 15h.01M12 15h.01M15.4 15v3.4M8.6 18.4h3.4" />
    </svg>
  );
}

export function IconUserCheck({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="9.6" cy="8" r="3.4" />
      <path d="M3.4 19.4v-1a4 4 0 0 1 4-4h4.4a4 4 0 0 1 3 1.3" />
      <path d="m15.6 17.6 1.8 1.8 3.2-3.4" />
    </svg>
  );
}

export function IconShieldCheck({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M12 3.2 5.4 6v5.3c0 4 2.8 7.7 6.6 9.5 3.8-1.8 6.6-5.5 6.6-9.5V6L12 3.2Z" />
      <path d="m9.4 11.9 1.9 1.9 3.4-3.6" />
    </svg>
  );
}

export function IconAlert({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.8v4.6" />
      <circle cx="12" cy="15.8" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconGlobe({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2M12 3.4a13 13 0 0 1 0 17.2M12 3.4a13 13 0 0 0 0 17.2" />
    </svg>
  );
}

export function IconWallet({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M18.6 7.4V6a1.8 1.8 0 0 0-1.8-1.8H5.6A1.8 1.8 0 0 0 3.8 6v12a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-1.4" />
      <path d="M20.2 10.4v3.2h-4a1.6 1.6 0 0 1 0-3.2h4Z" />
    </svg>
  );
}

export function IconBan({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconTrendUp({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="m3.6 16.4 5-5 3.2 3.2 6-6" />
      <path d="M14.4 8.6h3.4V12" />
    </svg>
  );
}

export function IconBanknote({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6.2 12h.01M17.8 12h.01" />
    </svg>
  );
}

export function IconRefresh({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M20 11.4a8 8 0 0 0-13.7-4.6L3.4 9.4" />
      <path d="M4 12.6a8 8 0 0 0 13.7 4.6l2.9-2.6" />
      <path d="M3.4 5.4v4h4M20.6 18.6v-4h-4" />
    </svg>
  );
}

export function IconUserX({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="9.6" cy="8" r="3.4" />
      <path d="M3.4 19.4v-1a4 4 0 0 1 4-4h4.4a4 4 0 0 1 2.6 1" />
      <path d="m16.6 16.2 4 4M20.6 16.2l-4 4" />
    </svg>
  );
}

export function IconMonitor({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <rect x="3" y="4.2" width="18" height="12" rx="2" />
      <path d="M8.6 19.8h6.8M12 16.2v3.6" />
    </svg>
  );
}

export function IconHeadset({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M4.4 15.4v-3a7.6 7.6 0 0 1 15.2 0v3" />
      <path d="M19.6 16.2a2 2 0 0 1-2 2h-.8v-5h.8a2 2 0 0 1 2 2v1ZM4.4 16.2a2 2 0 0 0 2 2h.8v-5h-.8a2 2 0 0 0-2 2v1Z" />
    </svg>
  );
}

export function IconHistory({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1L3.4 8.6" />
      <path d="M3.4 4.6v4h4M12 7.8V12l2.8 1.7" />
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
  shield: IconShieldAlert,
} as const;

export const TOPIC_ICONS = {
  doc: IconDoc,
  calculator: IconCalculator,
  userCheck: IconUserCheck,
  shieldCheck: IconShieldCheck,
  alert: IconAlert,
  globe: IconGlobe,
  wallet: IconWallet,
  ban: IconBan,
  trendUp: IconTrendUp,
  banknote: IconBanknote,
  shield: IconShieldAlert,
  refresh: IconRefresh,
  userX: IconUserX,
  monitor: IconMonitor,
  headset: IconHeadset,
  history: IconHistory,
} as const;

export type GroupIcon = keyof typeof GROUP_ICONS;
export type TopicIcon = keyof typeof TOPIC_ICONS;
