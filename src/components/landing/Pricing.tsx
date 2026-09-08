"use client";

import { useState } from "react";
import Link from "next/link";
import { CHALLENGE_PLANS, FUNDED_PLANS, type Plan } from "./data";
import { IconCheck, IconInfo } from "./icons";

function PlanCard({ plan, ctaHref, featured }: { plan: Plan; ctaHref: string; featured: boolean }) {
  return (
    <article
      className={[
        "flex flex-col overflow-hidden rounded-2xl border",
        featured ? "border-transparent" : "border-[var(--l-line)]",
      ].join(" ")}
    >
      <header className={featured ? "l-card-blue p-6 sm:p-7" : "bg-[var(--l-paper-2)] p-6 sm:p-7"}>
        <span
          className={[
            "inline-block rounded-md px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase",
            featured ? "bg-white/15 text-white" : "bg-[var(--l-line)] text-[var(--l-body)]",
          ].join(" ")}
        >
          {plan.phase}
        </span>
        <p
          className={[
            "nums mt-3.5 text-[clamp(1.75rem,5vw,2.4rem)] leading-none font-extrabold tracking-[-0.03em]",
            featured ? "text-white" : "text-[var(--l-ink)]",
          ].join(" ")}
        >
          {plan.size}
        </p>
      </header>

      <div className="flex flex-1 flex-col bg-white p-6 sm:p-7">
        <dl className="flex-1">
          {plan.rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 border-b border-[var(--l-line)] py-3.5 last:border-0"
            >
              <dt className="flex items-center gap-2 text-[13px] text-[var(--l-ink)] sm:text-[13.5px]">
                <span className="h-3.5 w-3.5 shrink-0 text-[var(--l-blue-500)]">
                  <IconCheck />
                </span>
                {r.label}
                {r.hint && (
                  <span className="h-3.5 w-3.5 shrink-0 text-[var(--l-body)]/50" aria-hidden>
                    <IconInfo />
                  </span>
                )}
              </dt>
              <dd className="nums shrink-0 text-right text-[13px] font-bold text-[var(--l-ink)] sm:text-[13.5px]">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        <a
          href="#faq"
          className="mt-5 text-[13px] font-semibold text-[var(--l-blue-500)] hover:underline"
        >
          All rules &rarr;
        </a>

        <div className="mt-5 flex items-center gap-2.5">
          <span className="nums text-[13.5px] text-[var(--l-body)] line-through">{plan.was}</span>
          <span className="rounded-md bg-[var(--l-red)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            -50%
          </span>
        </div>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="nums text-[28px] leading-none font-extrabold tracking-[-0.03em] text-[var(--l-ink)] sm:text-[32px]">
            {plan.now}
          </span>
          <span className="text-[13px] text-[var(--l-body)]">{plan.cadence}</span>
        </p>

        <Link
          href={ctaHref}
          className="mt-5 rounded-xl bg-[var(--l-navy-900)] px-5 py-3.5 text-center text-[14px] font-bold text-white transition-colors hover:bg-[var(--l-navy-800)]"
        >
          Get funded today
        </Link>
      </div>
    </article>
  );
}

/** Pricing with a Challenge / Funded toggle. */
export function Pricing({ ctaHref }: { ctaHref: string }) {
  const [tab, setTab] = useState<"challenge" | "funded">("challenge");
  const plans = tab === "challenge" ? CHALLENGE_PLANS : FUNDED_PLANS;

  return (
    <section id="pricing" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.12] font-extrabold tracking-[-0.03em] text-[var(--l-ink)]">
            Get started today
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[var(--l-body)] sm:text-[15.5px]">
            Custom-fit financing built for your unique situation.
          </p>
        </header>

        <div className="mt-9 flex justify-center">
          <div
            role="tablist"
            aria-label="Account type"
            className="inline-flex rounded-full border border-[var(--l-line)] bg-white p-1"
          >
            {(
              [
                ["challenge", "Challenge Accounts"],
                ["funded", "Funded accounts"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={[
                  "rounded-full px-4 py-2.5 text-[12.5px] font-semibold transition-colors sm:px-6 sm:text-[13.5px]",
                  tab === key
                    ? "bg-[var(--l-navy-900)] text-white"
                    : "text-[var(--l-body)] hover:text-[var(--l-ink)]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((p, i) => (
            <PlanCard key={`${p.phase}-${p.size}`} plan={p} ctaHref={ctaHref} featured={i === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
