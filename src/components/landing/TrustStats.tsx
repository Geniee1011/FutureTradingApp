import { TRUST_STATS } from "./data";
import { STAT_ICONS } from "./icons";

/**
 * Trust bar. Four figures divided by hairlines — 2×2 on phones, one row from
 * `sm`, with the dividers only drawn where a column actually sits beside
 * another one.
 */
export function TrustStats() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.1] font-extrabold tracking-[-0.03em] text-[var(--l-ink)]">
            The trusted name in{" "}
            <span className="l-serif font-normal">prop trading</span>
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[var(--l-body)] sm:text-[15.5px]">
            While others profit from your resets, we count payouts.
          </p>
        </header>

        <dl className="mt-12 grid grid-cols-2 gap-y-10 sm:mt-14 sm:grid-cols-4 sm:gap-y-0">
          {TRUST_STATS.map((s, i) => {
            const Icon = STAT_ICONS[s.icon];
            return (
              <div
                key={s.label}
                className={[
                  "flex flex-col items-center px-1 text-center xs:px-3",
                  // Hairline to the left of every column except the first in its row.
                  i % 2 === 1 ? "border-l border-[var(--l-line)]" : "",
                  i > 0 ? "sm:border-l sm:border-[var(--l-line)]" : "sm:border-l-0",
                ].join(" ")}
              >
                <span className="h-6 w-6 text-[var(--l-ink)] sm:h-7 sm:w-7">
                  <Icon />
                </span>
                <dd className="nums mt-3.5 text-[clamp(1.25rem,6vw,2.6rem)] leading-none font-extrabold tracking-[-0.03em] text-[var(--l-ink)]">
                  {s.value}
                </dd>
                <dt className="mt-2.5 text-[12.5px] text-[var(--l-body)]">{s.label}</dt>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
