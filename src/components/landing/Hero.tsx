import Link from "next/link";
import { Img } from "./Img";
import { HERO_FEATURES } from "./data";
import { IconCheck, IconArrowRight } from "./icons";

/** Small floating claim beside the statue. */
function Pill({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-[var(--l-line)] bg-white px-3 py-2.5 shadow-[0_10px_30px_-12px_rgba(10,35,66,0.25)] sm:gap-3 sm:px-4 sm:py-3 ${className ?? ""}`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--l-red)] p-1 text-white sm:h-6 sm:w-6">
        <IconCheck />
      </span>
      <span className="text-[10px] font-bold tracking-[0.1em] text-[var(--l-ink)] uppercase sm:text-[11.5px] sm:tracking-[0.12em]">
        {label}
      </span>
    </div>
  );
}

/**
 * Hero: headline, primary CTA, the statue as centre mark with two floating
 * claims either side, then the three guarantees.
 *
 * The pills are absolutely positioned from `md` up, matching the design. Below
 * that they stack under the CTA, where there is no room to float them without
 * colliding with the statue.
 */
export function Hero({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_55%_50%_at_50%_0%,rgba(47,111,208,0.08),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1180px] px-5 pt-12 pb-16 sm:px-8 sm:pt-16 lg:pt-20">
        <h1 className="mx-auto max-w-4xl text-center text-[clamp(1.75rem,7vw,3.9rem)] leading-[1.06] font-extrabold tracking-[-0.03em] text-[var(--l-ink)]">
          Get funded. Keep every dollar
          <span className="l-serif ml-2.5 font-normal">you make.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-relaxed text-[var(--l-body)] sm:text-[17px]">
          Prove yourself — scale to $1,000,000 — and keep 100% of your profits.
        </p>

        <div className="mt-7 flex justify-center sm:mt-8">
          <Link
            href={ctaHref}
            className="l-cta inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-bold sm:px-7 sm:text-[15px]"
          >
            {ctaLabel}
            <span className="h-4 w-4">
              <IconArrowRight />
            </span>
          </Link>
        </div>

        {/* Statue + floating claims. */}
        <div className="relative mt-8 sm:mt-10">
          <Pill
            label="100% of all profits are yours"
            className="absolute top-[38%] left-0 z-10 hidden max-w-[260px] md:flex lg:left-4"
          />
          <Pill
            label="Instant automated payouts"
            className="absolute top-[22%] right-0 z-10 hidden max-w-[260px] md:flex lg:right-4"
          />

          <Img
            src="/landing/vault-warrior.png"
            alt="Blue equestrian statue with raised sword"
            label="vault-warrior.png"
            fit="contain"
            priority
            sizes="(max-width: 640px) 88vw, (max-width: 1024px) 60vw, 520px"
            className="mx-auto h-[300px] w-full max-w-[340px] border-0 bg-transparent sm:h-[420px] sm:max-w-[420px] lg:h-[520px] lg:max-w-[520px]"
          />

          <div className="mt-6 flex flex-col items-center gap-3 md:hidden">
            <Pill label="100% of all profits are yours" />
            <Pill label="Instant automated payouts" />
          </div>
        </div>
      </div>

      {/* Three guarantees. */}
      <div className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="grid grid-cols-1 gap-8 border-t border-[var(--l-line)] pt-10 sm:grid-cols-3 sm:gap-10">
          {HERO_FEATURES.map((f) => (
            <article key={f.title} className="flex gap-3.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--l-red)] p-1.5 text-white">
                <IconCheck />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-[var(--l-ink)]">{f.title}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--l-body)]">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
