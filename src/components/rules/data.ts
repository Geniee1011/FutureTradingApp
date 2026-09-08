/**
 * Rules content.
 *
 * Every figure here is taken from `seedRuleTemplates()` in
 * `src/lib/mock/data.ts` — the tiers the rules engine actually provisions — so
 * the published rules and the enforced rules cannot drift apart. Notably:
 * Phase 1 target 3% / drawdown 4%, Phase 2 target 6% / drawdown 3% (tighter),
 * funded target 10% with an end-of-day drawdown floor, daily loss 2%
 * throughout, minimum hold 15s, and a 30%-of-target cap on any single day.
 */

export type GroupIcon = "book" | "scales" | "card" | "shield";

export interface Rule {
  /** Short question or statement used as the topic heading. */
  title: string;
  body: string;
  /** Optional label/value pairs rendered as a small table under the body. */
  facts?: { label: string; value: string }[];
}

export interface Group {
  id: string;
  title: string;
  icon: GroupIcon;
  blurb: string;
  rules: Rule[];
}

export const GROUPS: Group[] = [
  {
    id: "before-you-start",
    title: "Before you start",
    icon: "book",
    blurb: "What you are buying, how the evaluation is structured, and who can take part.",
    rules: [
      {
        title: "Account sizes and what you pay",
        body: "You buy an evaluation once. There is no subscription and no monthly fee, and resets are unlimited and free — we do not make money from selling you another attempt. Choose the size you can trade honestly, not the largest one you can afford.",
        facts: [
          { label: "Sizes", value: "$50K · $100K · $250K · $500K · $1M" },
          { label: "Billing", value: "One-time fee" },
          { label: "Resets", value: "Unlimited, free" },
        ],
      },
      {
        title: "The two-phase evaluation",
        body: "Phase 1 asks for a 3% gain. Phase 2 asks for 6% and tightens the drawdown from 4% to 3% — passing the first phase does not loosen the rules, it narrows them. Both phases require at least 5 separate trading days, so a single outsized session cannot pass you.",
        facts: [
          { label: "Phase 1 target", value: "3% of account size" },
          { label: "Phase 2 target", value: "6% of account size" },
          { label: "Minimum trading days", value: "5 per phase" },
        ],
      },
      {
        title: "Eligibility and account setup",
        body: "One account per purchase. Your order can be redeemed exactly once and the registration email must match the one that bought it, so a link cannot be forwarded or reused. Identity and proof of address are verified before the funded account is issued.",
        facts: [
          { label: "Accounts per purchase", value: "1" },
          { label: "Verification", value: "Photo ID + proof of address" },
          { label: "Minimum age", value: "18" },
        ],
      },
    ],
  },

  {
    id: "trading-rules",
    title: "Trading rules",
    icon: "scales",
    blurb: "The limits your account is measured against, on every order you send.",
    rules: [
      {
        title: "Profit target",
        body: "The target is a percentage of your starting balance, not of your current equity, so drawing down does not move it. Once you are funded the target becomes the threshold for a payout and an automatic doubling of your allocation.",
        facts: [
          { label: "Phase 1", value: "3%" },
          { label: "Phase 2", value: "6%" },
          { label: "Funded", value: "10%" },
        ],
      },
      {
        title: "Maximum drawdown",
        body: "During the evaluation the drawdown trails your highest equity intraday — it moves up with your gains and never back down. On a funded account it becomes an end-of-day floor instead, recalculated once at the session close, which gives you room to breathe inside the day.",
        facts: [
          { label: "Phase 1", value: "4% — intraday trailing" },
          { label: "Phase 2", value: "3% — intraday trailing" },
          { label: "Funded", value: "4% — end-of-day floor" },
        ],
      },
      {
        title: "Daily loss limit",
        body: "2% of your account size, measured from the session open and including open positions. Reaching it closes your positions and ends the day; the account resumes at the next session. It is a circuit breaker, not a breach — only the drawdown ends an evaluation.",
        facts: [
          { label: "Limit", value: "2% of account size" },
          { label: "$50,000 account", value: "$1,000" },
          { label: "$100,000 account", value: "$2,000" },
        ],
      },
      {
        title: "Position size and risk per trade",
        body: "Each tier carries a contract ceiling and a maximum risk per position. A stop-loss is required on every order — an order without one is rejected before it reaches the book rather than being closed out later.",
        facts: [
          { label: "$50K contracts", value: "3 (evaluation) · 5 (funded)" },
          { label: "$1M contracts", value: "30 (funded)" },
          { label: "Stop-loss", value: "Required on every order" },
        ],
      },
      {
        title: "Holding periods",
        body: "Positions must be held for at least 15 seconds; anything faster has its profit voided while its losses stand, which removes the incentive to scalp the feed. All positions must be flat before the session close — overnight and weekend holds are not permitted on any account type.",
        facts: [
          { label: "Minimum hold", value: "15 seconds" },
          { label: "Overnight holds", value: "Not permitted" },
          { label: "Weekend holds", value: "Not permitted" },
        ],
      },
    ],
  },

  {
    id: "getting-paid",
    title: "Getting paid",
    icon: "card",
    blurb: "What you keep, when you can take it, and how the money reaches you.",
    rules: [
      {
        title: "Profit split and scaling",
        body: "You keep 100% of the profits you make on a funded account. We take no cut. Each time you reach the 10% target your allocation doubles automatically — $50K to $100K, then $250K, $500K and $1,000,000 — with no application and no renegotiation.",
        facts: [
          { label: "Your share", value: "100%" },
          { label: "Payout trigger", value: "10% on a funded account" },
          { label: "Ceiling", value: "$1,000,000" },
        ],
      },
      {
        title: "Requesting a payout",
        body: "Request from your account page once you hit the target. Payouts are reviewed by the risk desk and paid within 24 hours; there is no minimum tenure and no requirement to keep trading first. You will be asked for a document only if verification is incomplete.",
        facts: [
          { label: "Processing", value: "Within 24 hours" },
          { label: "Minimum tenure", value: "None" },
          { label: "Fees", value: "None" },
        ],
      },
    ],
  },

  {
    id: "enforcement",
    title: "Enforcement & operations",
    icon: "shield",
    blurb: "How the rules are applied, what a breach costs you, and where to get help.",
    rules: [
      {
        title: "How limits are enforced",
        body: "Contract ceilings, risk per position and the stop-loss requirement are checked before an order leaves the ticket, so a non-compliant order is rejected rather than filled and unwound. Drawdown and daily loss are evaluated on every tick against your live equity.",
        facts: [
          { label: "Order limits", value: "Checked pre-trade" },
          { label: "Drawdown", value: "Evaluated on every tick" },
        ],
      },
      {
        title: "What happens when a rule is broken",
        body: "Breaching the maximum drawdown ends the evaluation and closes the account. Reaching the daily loss limit flattens your positions and ends that session only. Either way you are told which rule was hit, with the figure that triggered it — nothing is decided after the fact.",
        facts: [
          { label: "Drawdown breach", value: "Evaluation ends" },
          { label: "Daily loss", value: "Session ends, account survives" },
          { label: "Restart", value: "Free reset, immediately" },
        ],
      },
      {
        title: "Consistency: the single-day cap",
        body: "No single day may contribute more than 30% of your profit target. A day beyond that still counts toward your balance, but the surplus does not count toward passing. The rule exists so a funded account reflects a repeatable process rather than one lucky session.",
        facts: [
          { label: "Cap", value: "30% of profit target per day" },
          { label: "$50K Phase 1", value: "$450 of the $1,500 target" },
        ],
      },
      {
        title: "Minimum trading days",
        body: "Evaluations require 5 separate trading days and funded accounts 10 before a payout qualifies. Days count only when a position was actually opened — logging in is not a trading day.",
        facts: [
          { label: "Evaluation", value: "5 days" },
          { label: "Funded", value: "10 days" },
        ],
      },
      {
        title: "Prohibited strategies",
        body: "Latency and feed arbitrage, group trading of the same signal across multiple accounts, and any use of one account to hedge another are not permitted. These void the profits they produce. Automated strategies are allowed provided they respect every limit above.",
        facts: [
          { label: "Automation", value: "Allowed, within limits" },
          { label: "Copy trading across accounts", value: "Not permitted" },
          { label: "News trading", value: "Allowed" },
        ],
      },
      {
        title: "Platform, data and outages",
        body: "Markets are CME futures — E-mini and Micro contracts across equity index, energy and metals — on a live Databento feed. If our platform or feed fails during a session, affected trades are reviewed and rule breaches caused by the outage are reversed.",
        facts: [
          { label: "Markets", value: "CME futures (E-mini, Micro)" },
          { label: "Instruments", value: "ES · NQ · YM · CL · GC + Micros" },
          { label: "Outages", value: "Reviewed and reversed" },
        ],
      },
    ],
  },
];
