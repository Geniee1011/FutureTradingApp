import type { StepCard } from "./data";
import { IconCheck } from "./icons";

/* Mock product surfaces illustrating each step. These are presentational only —
   fixed sample figures, not live account data. */

const SHELL = "rounded-2xl p-5 sm:p-6";
const LABEL = "text-[9.5px] font-bold tracking-[0.16em] uppercase sm:text-[10.5px]";

function Picker() {
  const sizes = [
    { tag: "$10k", amount: "$10,000", note: "Lowest barrier to start trading.", active: false },
    { tag: "$50k", amount: "$50,000", note: "Room to scale without overcommitting.", active: true },
    { tag: "$100k", amount: "$100,000", note: "For traders with a proven strategy.", active: false },
  ];
  return (
    <div className={`${SHELL} bg-[var(--l-navy-800)]`}>
      <p className={`${LABEL} text-center text-white/45`}>Choose your account</p>
      <p className="mt-1.5 text-center text-[15px] font-bold text-white">Pick your size</p>

      <ul className="mt-5 space-y-2.5">
        {sizes.map((s) => (
          <li
            key={s.tag}
            className={[
              "flex items-center gap-3 rounded-xl px-3 py-2.5",
              s.active ? "bg-white" : "border border-white/10 bg-white/[0.05]",
            ].join(" ")}
          >
            <span
              className={[
                "nums shrink-0 rounded-lg px-2 py-1.5 text-[10.5px] font-bold",
                s.active ? "bg-[var(--l-navy-900)] text-white" : "bg-white/10 text-white/80",
              ].join(" ")}
            >
              {s.tag}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={[
                  "nums block text-[13px] font-bold",
                  s.active ? "text-[var(--l-ink)]" : "text-white",
                ].join(" ")}
              >
                {s.amount}
              </span>
              <span
                className={[
                  "block truncate text-[10.5px]",
                  s.active ? "text-[var(--l-body)]" : "text-white/45",
                ].join(" ")}
              >
                {s.note}
              </span>
            </span>
            {s.active && (
              <span className="shrink-0 rounded-md bg-[var(--l-red)] px-2 py-1 text-[9px] font-bold tracking-[0.1em] text-white uppercase">
                You
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Target() {
  return (
    <div className={`${SHELL} l-card-blue`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`${LABEL} text-white/50`}>Evaluation</p>
          <p className="mt-1.5 text-[15px] font-bold text-white">Profit target reached</p>
        </div>
        <span className="nums shrink-0 text-[12px] font-bold text-[var(--l-blue-300)]">+10.4%</span>
      </div>

      {/* Equity curve — a fixed illustrative path. */}
      <svg viewBox="0 0 300 96" className="mt-5 h-24 w-full" role="img" aria-label="Rising equity curve">
        <defs>
          <linearGradient id="l-eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 78 L40 70 L78 74 L116 56 L154 60 L192 40 L230 34 L268 18 L296 10 L296 96 L0 96 Z" fill="url(#l-eq)" />
        <path
          d="M0 78 L40 70 L78 74 L116 56 L154 60 L192 40 L230 34 L268 18 L296 10"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="296" cy="10" r="4" fill="#fff" />
      </svg>
    </div>
  );
}

function Funded() {
  return (
    <div className={`${SHELL} bg-[var(--l-navy-900)]`}>
      <div className="rounded-xl bg-[var(--l-navy-800)] p-4">
        <div className="flex items-start justify-between gap-3">
          <p className={`${LABEL} text-white/45`}>Funded account</p>
          <span className="shrink-0 rounded-md bg-[#16c784] px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] text-[#062c1c] uppercase">
            Live
          </span>
        </div>
        <p className="nums mt-3 text-[26px] leading-none font-extrabold text-white sm:text-[30px]">$50,000</p>
        <p className="mt-1.5 text-[11px] text-white/45">Buying power</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          { k: "Today P&L", v: "+$1,240" },
          { k: "Drawdown", v: "$0 / $2,500" },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
            <p className={`${LABEL} text-white/40`}>{s.k}</p>
            <p className="nums mt-1.5 text-[13.5px] font-bold text-white">{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Payout() {
  const rows = [
    { label: "Requested", time: "12:04 PM", done: false },
    { label: "Approved", time: "12:11 PM", done: false },
    { label: "Sent to wallet", time: "12:46 PM", done: true },
  ];
  return (
    <div className={`${SHELL} bg-[var(--l-navy-900)]`}>
      <p className={`${LABEL} text-white/45`}>Payout request</p>
      <p className="nums mt-2.5 text-[26px] leading-none font-extrabold text-white sm:text-[32px]">$5,240.00</p>
      <p className="mt-1.5 text-[11px] text-white/45">100% of profits — no split.</p>

      <ul className="mt-5 space-y-2">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center gap-2.5 rounded-lg bg-[var(--l-navy-800)] px-3 py-2.5"
          >
            <span
              className={[
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full p-0.5 text-white",
                r.done ? "bg-[#16c784]" : "bg-white/20",
              ].join(" ")}
            >
              <IconCheck />
            </span>
            <span className="flex-1 text-[11.5px] font-medium text-white/85">{r.label}</span>
            <span className="nums text-[10.5px] text-white/45">{r.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Scaling() {
  const tiers = [
    { k: "$50K", pct: 30 },
    { k: "$100K", pct: 45 },
    { k: "$250K", pct: 62 },
    { k: "$500K", pct: 78 },
    { k: "$1M", pct: 100, max: true },
  ];
  return (
    <div className={`${SHELL} bg-[var(--l-navy-900)]`}>
      <p className={`${LABEL} text-white/45`}>Scaling plan</p>
      <p className="mt-1.5 text-[15px] font-bold text-white">Path to $1,000,000</p>

      <ul className="mt-5 space-y-2.5">
        {tiers.map((t) => (
          <li key={t.k} className="flex items-center gap-3">
            <span className="nums w-12 shrink-0 text-[10.5px] font-semibold text-white/60">{t.k}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className={`block h-full rounded-full ${t.max ? "bg-[var(--l-red)]" : "bg-[var(--l-blue-400)]"}`}
                style={{ width: `${t.pct}%` }}
              />
            </span>
            {t.max && (
              <span className="shrink-0 rounded-md bg-[var(--l-red)] px-1.5 py-0.5 text-[8.5px] font-bold tracking-[0.1em] text-white uppercase">
                Max
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CARDS: Record<StepCard, () => React.JSX.Element> = {
  picker: Picker,
  target: Target,
  funded: Funded,
  payout: Payout,
  scaling: Scaling,
};

export function StepMock({ card }: { card: StepCard }) {
  const C = CARDS[card];
  return <C />;
}
