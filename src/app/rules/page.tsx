import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";
import { LandingNav } from "@/components/landing/LandingNav";
import { RulesExplorer } from "@/components/rules/RulesExplorer";
import { IconArrowRight } from "@/components/rules/icons";

const TITLE = "Trading rules — The Vault";
const DESCRIPTION =
  "Every rule that applies before, during and after your evaluation: targets, drawdown, daily loss, position limits, payouts and enforcement.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article", siteName: "The Vault" },
};

/** Public rules reference. Session only decides where the CTA points. */
export default async function RulesPage() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const role = session?.split(":")[1];

  const isAuthed = Boolean(session);
  const portalHref = role === "admin" ? "/admin/traders" : "/dashboard";
  const ctaHref = isAuthed ? portalHref : "/#pricing";

  return (
    <div className="landing min-h-screen bg-white">
      <a href="#main" className="l-skip">
        Skip to content
      </a>

      <LandingNav isAuthed={isAuthed} homeHref={portalHref} />

      <main id="main" className="mx-auto max-w-[900px] px-5 py-14 sm:px-8 sm:py-20">
        <header className="text-center">
          <p className="l-serif text-[15px] text-[var(--l-blue-500)]">Transparency first</p>
          <h1 className="mt-2.5 text-[clamp(1.9rem,6vw,3.1rem)] leading-[1.05] font-extrabold tracking-[-0.01em] text-[var(--l-ink)] uppercase">
            Trading rules
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-[var(--l-body)] sm:text-[15px]">
            Everything you need to know before, during, and after your evaluation. Pick a topic to
            get started.
          </p>
        </header>

        <div className="mt-10 sm:mt-12">
          <RulesExplorer />
        </div>

        <section className="mt-12 rounded-xl border border-[var(--l-line)] bg-white px-6 py-10 text-center sm:mt-16 sm:px-10 sm:py-12">
          <h2 className="text-[clamp(1.25rem,3.4vw,1.75rem)] font-extrabold tracking-[-0.02em] text-[var(--l-ink)]">
            Ready to trade our capital?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-[var(--l-body)] sm:text-[14.5px]">
            Start your evaluation today. Pass the challenge, get funded, and keep 100% of your
            profits.
          </p>
          <Link
            href={ctaHref}
            className="l-cta mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-bold"
          >
            {isAuthed ? "Go to your dashboard" : "Get Funded Today"}
            <span className="h-4 w-4">
              <IconArrowRight />
            </span>
          </Link>
        </section>
      </main>

      <footer className="border-t border-[var(--l-line)] py-8">
        <p className="text-center text-[12px] text-[var(--l-body)]/70">
          © {new Date().getFullYear()} The Vault. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
