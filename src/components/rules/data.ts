import type { GroupIcon, TopicIcon } from "./icons";

/**
 * Rules content.
 *
 * Figures come from `seedRuleTemplates()` in `src/lib/mock/data.ts` — the tiers
 * the rules engine actually provisions — so the published rules and the
 * enforced rules cannot drift apart. Key values: Phase 1 target 3% / drawdown
 * 4%, Phase 2 target 6% / drawdown 3% (tighter), funded target 10% with an
 * end-of-day drawdown floor, daily loss 2% throughout, minimum hold 15s, and a
 * 30%-of-target cap on any single day.
 */

export interface Fact {
  label: string;
  value: string;
}

export interface Topic {
  id: string;
  title: string;
  icon: TopicIcon;
  body: string;
  facts?: Fact[];
  /** Extra bullet points shown under the body. */
  points?: string[];
}

export interface Group {
  id: string;
  title: string;
  icon: GroupIcon;
  topics: Topic[];
}

export const GROUPS: Group[] = [
  {
    id: "before-you-start",
    title: "Before you start",
    icon: "book",
    topics: [
      {
        id: "overview",
        title: "Overview",
        icon: "doc",
        body:
          "The Vault funds futures traders. You buy one evaluation, prove you can trade within a fixed set of limits, and we put our capital behind you. There is no subscription, no profit split, and no cap on how many times you may try.",
        points: [
          "Buy an evaluation once — resets after that are free and unlimited.",
          "Clear two phases without breaking a limit.",
          "Trade a funded account and keep 100% of what you make.",
          "Every 10% doubles your allocation, up to $1,000,000.",
        ],
      },
      {
        id: "definitions",
        title: "Definitions & How Everything Is Calculated",
        icon: "calculator",
        body:
          "Every limit below is derived from your starting balance, never from your current equity. Drawing down does not lower your target, and profit does not raise it. Read this section first — most disputes come from assuming a different basis.",
        facts: [
          { label: "Starting balance", value: "The account size you bought" },
          { label: "Equity", value: "Balance plus open position P&L" },
          { label: "Profit target", value: "% of starting balance" },
          { label: "Daily loss", value: "Measured from the session open" },
          { label: "Trading day", value: "A day on which a position was opened" },
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility & Account Ownership",
        icon: "userCheck",
        body:
          "Accounts are personal. The person who passes the evaluation must be the person who trades the funded account, and identity is verified before funding is released.",
        facts: [
          { label: "Minimum age", value: "18" },
          { label: "Accounts per purchase", value: "1" },
          { label: "Verification", value: "Photo ID + proof of address" },
        ],
        points: [
          "One account per person. Multiple accounts held by one trader are closed.",
          "Accounts may not be sold, shared, transferred or traded by anyone else.",
          "The registration email must match the email that made the purchase.",
        ],
      },
    ],
  },

  {
    id: "trading-rules",
    title: "Trading rules",
    icon: "scales",
    topics: [
      {
        id: "evaluation",
        title: "Evaluation: 2-Step Challenge",
        icon: "shieldCheck",
        body:
          "Two phases, both measured against your starting balance. Passing Phase 1 does not relax the rules — Phase 2 asks for more profit against a tighter drawdown. There is no time limit on either phase.",
        facts: [
          { label: "Phase 1 target", value: "3% of account size" },
          { label: "Phase 2 target", value: "6% of account size" },
          { label: "Minimum trading days", value: "5 per phase" },
          { label: "Time limit", value: "None" },
        ],
      },
      {
        id: "drawdown",
        title: "Drawdown & Risk Limits",
        icon: "alert",
        body:
          "During an evaluation the drawdown trails your highest equity intraday: it rises with your gains and never falls back. On a funded account it becomes an end-of-day floor, recalculated once at the session close, which gives you room to work inside the day.",
        facts: [
          { label: "Phase 1 drawdown", value: "4% — intraday trailing" },
          { label: "Phase 2 drawdown", value: "3% — intraday trailing" },
          { label: "Funded drawdown", value: "4% — end-of-day floor" },
          { label: "Daily loss limit", value: "2% of account size" },
        ],
        points: [
          "A stop-loss is required on every order; orders without one are rejected.",
          "Breaching the maximum drawdown ends the evaluation.",
          "Reaching the daily loss limit ends the session only — the account survives.",
        ],
      },
      {
        id: "instruments",
        title: "Instruments & Trading Hours",
        icon: "globe",
        body:
          "CME futures only, priced from a live Databento feed. You may trade the full session, but every position must be closed before it ends — the platform flattens anything still open.",
        facts: [
          { label: "Equity index", value: "ES · NQ · YM (+ Micros)" },
          { label: "Energy", value: "CL (+ MCL)" },
          { label: "Metals", value: "GC (+ MGC)" },
          { label: "Overnight holds", value: "Not permitted" },
          { label: "Weekend holds", value: "Not permitted" },
        ],
      },
      {
        id: "funded-rules",
        title: "Funded Account Rules",
        icon: "wallet",
        body:
          "Once funded, the target becomes the threshold for a payout and an automatic doubling of your allocation. The rule set is the same one you passed on, with the drawdown switched to an end-of-day floor and higher contract ceilings.",
        facts: [
          { label: "Profit target", value: "10% of account size" },
          { label: "Minimum trading days", value: "10" },
          { label: "$50K contracts", value: "5" },
          { label: "$1M contracts", value: "30" },
        ],
      },
      {
        id: "prohibited",
        title: "Prohibited Practices",
        icon: "ban",
        body:
          "The limits above assume you are taking genuine market risk. The following exploit the evaluation rather than pass it, and void the profits they produce.",
        points: [
          "Latency arbitrage, or trading against a delayed or erroneous feed.",
          "Running the same signal across multiple accounts so that one is bound to pass.",
          "Hedging one account against another, whether yours or held by someone else.",
          "Holding a position for under 15 seconds — profit is voided, losses stand.",
          "Automated strategies are permitted, provided they respect every limit.",
        ],
      },
    ],
  },

  {
    id: "getting-paid",
    title: "Getting paid",
    icon: "card",
    topics: [
      {
        id: "scaling",
        title: "Scaling Plan",
        icon: "trendUp",
        body:
          "Each time you reach the 10% target on a funded account your allocation doubles. There is no application, no interview and no renegotiation — it happens on the payout.",
        facts: [
          { label: "Step 1", value: "$50,000" },
          { label: "Step 2", value: "$100,000" },
          { label: "Step 3", value: "$250,000" },
          { label: "Step 4", value: "$500,000" },
          { label: "Maximum", value: "$1,000,000" },
        ],
      },
      {
        id: "payouts",
        title: "Payouts & Profit Split",
        icon: "banknote",
        body:
          "You keep everything you make. We do not take a percentage, and we do not charge for withdrawing. Request from your account page once you have hit the target and met the minimum trading days.",
        facts: [
          { label: "Your share", value: "100%" },
          { label: "Processing time", value: "Within 24 hours" },
          { label: "Minimum tenure", value: "None" },
          { label: "Withdrawal fee", value: "None" },
        ],
      },
    ],
  },

  {
    id: "enforcement",
    title: "Enforcement & operations",
    icon: "shield",
    topics: [
      {
        id: "breach",
        title: "Breach System & Enforcement",
        icon: "shield",
        body:
          "Limits are enforced by the platform, not reviewed afterwards. Contract ceilings, risk per position and the stop-loss requirement are checked before an order leaves the ticket, so a non-compliant order is rejected rather than filled and unwound later.",
        facts: [
          { label: "Order limits", value: "Checked pre-trade" },
          { label: "Drawdown", value: "Evaluated on every tick" },
          { label: "Single-day cap", value: "30% of profit target" },
        ],
        points: [
          "A hard breach — maximum drawdown — ends the evaluation immediately.",
          "A soft breach — daily loss — flattens positions and ends that session.",
          "You are always told which rule was hit and the figure that triggered it.",
        ],
      },
      {
        id: "resets",
        title: "Resets, Retries & Subscription",
        icon: "refresh",
        body:
          "We do not make money from selling you another attempt, so resets are free and unlimited. There is no monthly fee and nothing recurring to cancel.",
        facts: [
          { label: "Evaluation fee", value: "One-time" },
          { label: "Resets", value: "Unlimited, free" },
          { label: "Subscription", value: "None" },
        ],
      },
      {
        id: "inactivity",
        title: "Account Inactivity & Closure",
        icon: "userX",
        body:
          "Accounts are expected to be traded. An account with no activity for an extended period is closed to free the allocation, and you are notified before that happens.",
        facts: [
          { label: "Inactivity window", value: "30 days without a trade" },
          { label: "Notice", value: "Emailed before closure" },
          { label: "Pending payouts", value: "Always paid before closure" },
        ],
      },
      {
        id: "platform",
        title: "Platform, Data & Execution",
        icon: "monitor",
        body:
          "Trading runs through our own web terminal on a live Databento feed. If the platform or the feed fails during a session, affected trades are reviewed and any rule breach caused by the outage is reversed.",
        facts: [
          { label: "Platform", value: "Web terminal" },
          { label: "Market data", value: "Databento, live" },
          { label: "Outage breaches", value: "Reviewed and reversed" },
        ],
      },
      {
        id: "support",
        title: "Support & Disputes",
        icon: "headset",
        body:
          "If you believe a fill, a breach or a payout was handled incorrectly, raise it and we will review the underlying tick data with you. Decisions are explained with the figures behind them.",
        facts: [
          { label: "First response", value: "Within one business day" },
          { label: "Trade review", value: "Against recorded tick data" },
          { label: "Escalation", value: "To the risk desk" },
        ],
      },
      {
        id: "amendments",
        title: "Amendments & Version History",
        icon: "history",
        body:
          "Rules change as the product matures. Changes are versioned and dated, and anything that tightens a limit takes effect only for accounts opened after it — an account already in progress finishes under the rules it started on.",
        facts: [
          { label: "Notice period", value: "14 days for tightened limits" },
          { label: "In-progress accounts", value: "Finish on their original rules" },
          { label: "History", value: "Published with each change" },
        ],
      },
    ],
  },
];
