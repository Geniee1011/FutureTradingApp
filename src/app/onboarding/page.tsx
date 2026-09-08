import type { Metadata } from "next";
import Link from "next/link";
import { Wizard } from "@/components/onboarding/Wizard";
import { IconAlert } from "@/components/onboarding/icons";

export const metadata: Metadata = {
  title: "Complete your onboarding — The Vault",
  description: "Set up your profile, verify your identity and activate your funded trading account.",
};

/** Order numbers come from ClickFunnels; keep the accepted shape narrow. */
const ORDER_RE = /^[A-Za-z0-9-]{4,32}$/;

/**
 * Onboarding entry point — reached from the purchase email as
 * `/onboarding?order=12345`.
 *
 * Separate from `/register`, which remains the portal's own sign-up. Onboarding
 * can only originate from a purchase, so with no usable `order` the wizard is
 * not rendered at all. That check is presentational for now: the real gate
 * (does the order exist, is it PAID, is it unconsumed, does the email match)
 * belongs to the API route that validates against the `Purchase` table, which
 * is out of scope here.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const valid = typeof order === "string" && ORDER_RE.test(order);

  return (
    <div className="onboarding min-h-screen bg-white">
      <header className="border-b border-[var(--l-line)]">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center px-5 sm:h-16 sm:px-8">
          <Link
            href="/"
            className="text-[13px] font-extrabold tracking-[0.22em] text-[var(--l-ink)] uppercase sm:text-[15px]"
          >
            The Vault
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8 sm:py-14">
        {valid ? <Wizard orderNumber={order} /> : <MissingOrder />}
      </main>
    </div>
  );
}

/** Shown when the link carries no usable order number. */
function MissingOrder() {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--l-red)]/10 p-3.5 text-[var(--l-red)]">
        <IconAlert />
      </span>

      <h1 className="mt-6 text-[clamp(1.5rem,4vw,2rem)] font-extrabold tracking-[-0.02em] text-[var(--l-ink)]">
        This link isn&rsquo;t valid
      </h1>

      <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--l-body)]">
        Onboarding can only be started from a purchase. Open the link in your order confirmation
        email — it looks like{" "}
        <span className="nums font-semibold text-[var(--l-ink)]">/onboarding?order=12345</span> — or
        buy a challenge to receive one.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/#pricing" className="l-cta rounded-xl px-6 py-3.5 text-[14px] font-bold">
          View pricing
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-[var(--l-line)] px-6 py-3.5 text-[14px] font-semibold text-[var(--l-ink)] transition-colors hover:bg-[var(--l-paper-2)]"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
