/** Icons for the onboarding wizard. All inherit `currentColor`. */

type P = { className?: string };
const base = "h-full w-full";

export function IconCheck({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  );
}

export function IconUser({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.5v-1a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1" />
    </svg>
  );
}

export function IconShield({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M12 3.2 5.4 6v5.3c0 4 2.8 7.7 6.6 9.5 3.8-1.8 6.6-5.5 6.6-9.5V6L12 3.2Z" />
      <path d="m9.4 12 1.9 1.9 3.4-3.6" />
    </svg>
  );
}

export function IconRocket({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M13.5 4.8c3-2 6.2-1.6 6.2-1.6s.4 3.2-1.6 6.2l-2.3 3.4-5.7-5.7 3.4-2.3Z" />
      <path d="m9.6 7.6-3.2.7-1.9 2.9 3.1.9M16 14.1l-.7 3.2-2.9 1.9-.9-3.1" />
      <path d="M7.3 16.7c-.9.9-1.4 3.3-1.4 3.3s2.4-.5 3.3-1.4a1.4 1.4 0 0 0-1.9-1.9Z" />
    </svg>
  );
}

export function IconChevron({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconUpload({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <path d="M4.5 15.5v2.2a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
      <path d="M12 15.5V4.8M8 8.6 12 4.6l4 4" />
    </svg>
  );
}

export function IconLock({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
    </svg>
  );
}

export function IconAlert({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? base} aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.6v5" />
      <circle cx="12" cy="16.2" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const STEP_ICONS = {
  user: IconUser,
  shield: IconShield,
  rocket: IconRocket,
} as const;

export type StepIcon = keyof typeof STEP_ICONS;
