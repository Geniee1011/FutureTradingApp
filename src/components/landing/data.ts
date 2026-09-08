/** Landing page content — "The Vault". */

/* ----------------------------- Hero ----------------------------- */

export const HERO_FEATURES = [
  {
    title: "Guaranteed payouts",
    body: "Hit your profit target and your payout processes automatically the same day. No payout denials - ever.",
  },
  {
    title: "Keep 100% of the profits",
    body: "Every dollar you earn on your funded account is yours. We don't take a cut.",
  },
  {
    title: "Unlimited resets for free",
    body: "We don't make money from selling you resets — so there's no limit on how many times you can try.",
  },
];

/* -------------------------- Scaling ladder -------------------------- */

export interface Rung {
  amount: string;
  stage: string;
  body: string;
  /** Payout shown once the account is funded; the first rung has none. */
  payout?: { label: string; value: string };
}

export const LADDER: Rung[] = [
  {
    amount: "$50,000",
    stage: "Start here",
    body: "Pass the 2-step evaluation and unlock your first funded account. Reset as many times as you need for free.",
  },
  {
    amount: "$50,000",
    stage: "First funded account",
    body: "You passed. Now you're trading with a funded account. Hit your 10% profit target and we pay you in full — then upgrade your account automatically.",
    payout: { label: "Hit 10% and get a payout of:", value: "$5,000" },
  },
  {
    amount: "$100,000",
    stage: "First upgrade",
    body: "Your allocation doubles. Same rules, same platform, twice the buying power behind every trade you take.",
    payout: { label: "Hit 10% and earn", value: "$10,000" },
  },
  {
    amount: "$250,000",
    stage: "Second upgrade",
    body: "A quarter of a million in capital. At this level a single good month changes what trading means for you.",
    payout: { label: "Hit 10% and earn", value: "$25,000" },
  },
  {
    amount: "$500,000",
    stage: "Third upgrade",
    body: "You've proven yourself three times over. Half a million dollars of capital, fully under your control.",
    payout: { label: "Hit 10% and earn", value: "$50,000" },
  },
  {
    amount: "$1,000,000",
    stage: "Maximum allocation",
    body: "The top of the ladder. Trade our capital at full scale, keep 100% of everything you make. Hit 10% and collect your payout — every single time.",
    payout: { label: "Hit 10% and earn", value: "$100,000" },
  },
];

/* ---------------------------- Trust stats ---------------------------- */

export const TRUST_STATS = [
  { icon: "users" as const, value: "100%", label: "All profits are yours" },
  { icon: "medal" as const, value: "4.8 / 5", label: "Rating" },
  { icon: "clock" as const, value: "48h", label: "Max Payout Processing" },
  { icon: "infinity" as const, value: "Unlimited", label: "free resets" },
];

/* ---------------------------- Certificates ---------------------------- */

export const CERTIFICATES = [
  { amount: "$50,000", name: "James T.", date: "May 14, 2026", account: "500,000 $" },
  { amount: "$50,000", name: "James T.", date: "May 14, 2026", account: "500,000 $" },
  { amount: "$25,000", name: "William R.", date: "May 13, 2026", account: "250,000 $" },
  { amount: "$12,400", name: "Sophia J.", date: "May 12, 2026", account: "100,000 $" },
  { amount: "$100,000", name: "Oliver M.", date: "May 11, 2026", account: "1,000,000 $" },
  { amount: "$7,800", name: "Emma L.", date: "May 9, 2026", account: "50,000 $" },
];

/* ------------------------------ Reviews ------------------------------ */

export interface Review {
  quote: string;
  name: string;
}

export const REVIEWS: Review[] = [
  { quote: "Failed the first time. Came back, sized down, started scaling into trades instead of going all-in. Passed on round two. Should've traded like that from the start honestly.", name: "Oliver M." },
  { quote: "Had a question about scaling, got a real answer in like 5 minutes. Sounds small but most firms just send you a link to the FAQ.", name: "Henry K." },
  { quote: "Clean setup, no weird gotchas. I've tried two other prop firms before and both had some catch buried in the fine print. Not here.", name: "James T." },
  { quote: "First prop firm I've used where futures actually feel like the main thing, not something bolted on. The tools are solid and the rules make sense.", name: "William R." },
  { quote: "You trade well, you get paid. No games around payouts, no moving goalposts.", name: "Emma L." },
  { quote: "I can actually make money without overtrading, which keeps me from revenge trading, and my PnL shows it.", name: "Edward S." },
  { quote: "Clean dashboard, fast execution, and payouts that land when they say they will. Everything a serious trader needs.", name: "George H." },
  { quote: "They treat you like a partner, not a customer. The rules are realistic and there's actual room to grow. That matters more than people think.", name: "Benjamin P." },
  { quote: "Wanted the education plus funding combo and that's exactly what this is. Did two strategy modules, tightened up my journal, and the consistency rule killed my bad habit of YOLO trades. Equity curve looks way cleaner now.", name: "Sophia J." },
  { quote: "Requested my first payout on Tuesday, next morning it was in my account. They asked for one more document, answered and released in 20 minutes. Perfect.", name: "Thomas W." },
  { quote: "Scaling plan is legit. Hit 10%, got paid in full, woke up to double the capital. No emails, no tickets.", name: "Andrew C." },
  { quote: "From evaluation to funded in 9 days. Payout processed in 36 hours. This is how prop trading should work.", name: "Charlotte B." },
  { quote: "The consistency rule forced me to size properly and take quality setups. My equity curve has never looked this smooth.", name: "Daniel R." },
  { quote: "Support actually knows trading. They helped me fix my position sizing issue instead of copy-pasting a script.", name: "Marek P." },
  { quote: "Best risk tools I've used at any firm. The daily loss limit keeps me disciplined instead of feeling like a trap.", name: "Lucas F." },
];

/* ---------------------------- Five steps ---------------------------- */

export type StepCard = "picker" | "target" | "funded" | "payout" | "scaling";

export const STEPS: { n: string; title: string; body: string; card: StepCard }[] = [
  {
    n: "01",
    title: "Start your evaluation",
    body: "Sign up and start your $50K challenge. Follow the rules, hit your profit target, and you're in. Simple as that.",
    card: "picker",
  },
  {
    n: "02",
    title: "Pass the challenge",
    body: "Hit your profit target while trading within your rules and risk limits. No time pressure, no hidden conditions — just consistent trading.",
    card: "target",
  },
  {
    n: "03",
    title: "Get funded",
    body: "Pass the evaluation and your funded account is live the same day. From here, every trade counts toward your first payout. And unlike most firms, we actually want you to succeed — we don't make money from your fees, we make money when you trade well. So it's in our interest to see you win.",
    card: "funded",
  },
  {
    n: "04",
    title: "Get paid",
    body: "Follow the rules, reach 10% on your funded account, and your full payout hits your account within 24 hours. No human review, no denials. And unlike every other prop firm — you keep 100% of it.",
    card: "payout",
  },
  {
    n: "05",
    title: "Scale up",
    body: "Every time you hit 10% on your funded account, we double your allocation — automatically. From $50K to $100K, then $250K, $500K, all the way to $1,000,000 in buying power.",
    card: "scaling",
  },
];

/* ----------------------------- Pricing ----------------------------- */

export interface Plan {
  phase: string;
  size: string;
  rows: { label: string; value: string; hint?: boolean }[];
  was: string;
  now: string;
  cadence: string;
}

export const CHALLENGE_PLANS: Plan[] = [
  {
    phase: "Phase 1",
    size: "$50,000",
    rows: [
      { label: "Profit target", value: "$1,500 (3%)" },
      { label: "Maximum Drawdown", value: "$2,000" },
      { label: "Drawdown mode", value: "Trailing", hint: true },
      { label: "Max risk per position", value: "$500 (1%)", hint: true },
      { label: "Instrument", value: "Futures", hint: true },
      { label: "Resets", value: "Unlimited free resets" },
    ],
    was: "$199",
    now: "$97",
    cadence: "per month",
  },
  {
    phase: "Phase 2",
    size: "$50,000",
    rows: [
      { label: "Profit target", value: "$3,000 (6%)" },
      { label: "Maximum Drawdown", value: "$1,500" },
      { label: "Drawdown mode", value: "Trailing", hint: true },
      { label: "Max risk per position", value: "$500 (1%)", hint: true },
      { label: "Instrument", value: "Futures", hint: true },
      { label: "Resets", value: "Unlimited free resets" },
    ],
    was: "$199",
    now: "$97",
    cadence: "per month",
  },
];

export const FUNDED_PLANS: Plan[] = [
  {
    phase: "Funded",
    size: "$50,000",
    rows: [
      { label: "Profit target", value: "$5,000 (10%)" },
      { label: "Maximum Drawdown", value: "$2,000" },
      { label: "Drawdown mode", value: "End of day", hint: true },
      { label: "Max risk per position", value: "$1,250 (2.5%)", hint: true },
      { label: "Instrument", value: "Futures", hint: true },
      { label: "Profit split", value: "You keep 100%" },
    ],
    was: "$0",
    now: "$0",
    cadence: "no monthly fee",
  },
  {
    phase: "Funded",
    size: "$100,000",
    rows: [
      { label: "Profit target", value: "$10,000 (10%)" },
      { label: "Maximum Drawdown", value: "$4,000" },
      { label: "Drawdown mode", value: "End of day", hint: true },
      { label: "Max risk per position", value: "$2,500 (2.5%)", hint: true },
      { label: "Instrument", value: "Futures", hint: true },
      { label: "Profit split", value: "You keep 100%" },
    ],
    was: "$0",
    now: "$0",
    cadence: "no monthly fee",
  },
];

/* -------------------------------- FAQ -------------------------------- */

export const FAQ = [
  {
    q: "How does the evaluation process work?",
    a: "You choose an account size, pay a one-time fee, and trade on a simulated account. Hit the profit target without breaking the rules, and you get a funded account with real capital.",
  },
  {
    q: "What is the profit split?",
    a: "You keep 100% of the profits you make on a funded account. We don't take a cut — we make money when our traders trade well, not by taking a slice of their payouts.",
  },
  {
    q: "How fast can I get funded?",
    a: "As fast as you can pass. There's no minimum number of days. Traders regularly clear both phases inside two weeks, and the funded account goes live the same day it's approved.",
  },
  {
    q: "Is there a time limit on the evaluation?",
    a: "No. Take as long as you need. There is no expiry on an evaluation and no pressure to force trades to beat a clock.",
  },
  {
    q: "What happens if I hit the drawdown limit?",
    a: "The account closes and the evaluation ends. Resets are unlimited and free, so you can start again straight away without paying a second time.",
  },
  {
    q: "Can I trade news or hold positions overnight?",
    a: "News trading is allowed. Positions must be flat before the session close — overnight and weekend holds are not permitted on evaluation or funded accounts.",
  },
  {
    q: "What platforms and markets are supported?",
    a: "CME futures — E-mini and Micro contracts across equity index, energy and metals — through our own web terminal, with live data and a full order ticket.",
  },
];

/* ---------------------------- Trader mosaic ---------------------------- */

export const FEATURED_TRADER = {
  src: "/landing/trader-center.jpg",
  name: "Mike Richards",
  role: "Top funded trader",
};

/** Tiles either side of the featured trader, left column first. */
export const MOSAIC_LEFT = [
  "/landing/trader-photo-3.jpeg",
  "/landing/trader-photo-4.jpeg",
  "/landing/trader-photo-5.jpeg",
  "/landing/trader-photo-6.jpg",
  "/landing/trader-photo-0.jpeg",
  "/landing/trader-bl.jpg",
];

export const MOSAIC_RIGHT = [
  "/landing/trader-photo-7.jpg",
  "/landing/trader-photo-8.jpg",
  "/landing/trader-photo-9.jpg",
  "/landing/trader-photo-10.jpg",
  "/landing/trader-photo-1.jpeg",
  "/landing/trader-photo-2.jpeg",
];

/* ------------------------------- Footer ------------------------------- */

export const FOOTER_LINKS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "Trade terminal", href: "/trade" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Orders", href: "/orders" },
      { label: "Account", href: "/account" },
    ],
  },
  {
    heading: "Programme",
    links: [
      { label: "Scaling plan", href: "#scaling" },
      { label: "How it works", href: "#how" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Traders", href: "#traders" },
      { label: "Reviews", href: "#reviews" },
      { label: "Payouts", href: "#payouts" },
      { label: "Sign in", href: "/login" },
    ],
  },
];
