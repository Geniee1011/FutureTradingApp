import type { SVGProps } from "react";

/* Minimal inline icon set (stroke-based, currentColor). Keeps the bundle free
   of an icon dependency while supporting the nav + UI affordances we need. */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const Icons = {
  dashboard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  trade: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M21 7v5h-5" />
    </svg>
  ),
  orders: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  account: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6 15h4" />
    </svg>
  ),
  users: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" />
      <path d="M17 19a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  ),
  rules: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  activity: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  ),
  analytics: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" rx="0.5" />
      <rect x="12" y="8" width="3" height="10" rx="0.5" />
      <rect x="17" y="4" width="3" height="14" rx="0.5" />
    </svg>
  ),
  alert: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  logout: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h12" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  chevronDown: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  logo: (p: IconProps) => (
    <svg {...base(p)} strokeWidth={2}>
      <path d="M3 16l5-6 4 3 6-8" />
      <circle cx="18" cy="5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  sun: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  moon: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
  eye: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.2 4.2M6.5 6.5C3.6 8.2 2 12 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  ),
} satisfies Record<string, (p: IconProps) => React.ReactNode>;

export type IconName = keyof typeof Icons;

export function Icon({ name, ...props }: { name: IconName } & IconProps) {
  const Cmp = Icons[name];
  return Cmp(props);
}
