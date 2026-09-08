import Link from "next/link";
import { LADDER } from "./data";
import { IconArrowRight } from "./icons";

/**
 * The scaling ladder: a red rail down the left with a glowing node per rung,
 * and the account cards offset to its right.
 *
 * The rail sits at 1rem on small screens and 6rem from `lg`, with the cards
 * indented to match, so the structure holds at every width instead of the rail
 * detaching from its nodes.
 */
export function ScalingLadder({ ctaHref }: { ctaHref: string }) {
  return (
    <section id="scaling" className="l-grid relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.8rem,4.4vw,2.9rem)] leading-[1.12] font-extrabold tracking-[-0.025em] text-white">
            One account.{" "}
            <span className="l-serif font-normal text-[var(--l-blue-300)]">Six rungs to a million.</span>
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/55 sm:text-[15.5px]">
            Every 10% you make doubles your allocation — automatically, with no application and no
            negotiation.
          </p>
        </header>

        <ol className="relative mt-14 sm:mt-16">
          {/* The rail. Inset so it lands under the node centres at each width. */}
          <span
            aria-hidden
            className="absolute top-3 bottom-3 left-[7px] w-px bg-gradient-to-b from-[var(--l-red)]/70 via-[var(--l-red)]/35 to-transparent sm:left-[11px] lg:left-[95px]"
          />

          {LADDER.map((rung) => (
            <li key={`${rung.amount}-${rung.stage}`} className="relative pb-8 pl-8 sm:pb-10 sm:pl-12 lg:pl-[150px]">
              <span
                aria-hidden
                className="l-node absolute top-3 left-[2px] h-3 w-3 rounded-full sm:left-[6px] sm:h-3.5 sm:w-3.5 lg:left-[90px]"
              />

              <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm sm:p-7">
                <p className="nums text-[clamp(1.75rem,5vw,2.6rem)] leading-none font-extrabold tracking-[-0.03em] text-white">
                  {rung.amount}
                </p>
                <p className="mt-2.5 text-[10.5px] font-bold tracking-[0.16em] text-white/40 uppercase sm:text-[11.5px]">
                  {rung.stage}
                </p>
                <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-white/60 sm:text-[14.5px]">
                  {rung.body}
                </p>

                {rung.payout && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="text-[11px] font-semibold tracking-[0.06em] text-white/40">
                      {rung.payout.label}
                    </p>
                    <p className="nums mt-1.5 text-[clamp(1.25rem,3.4vw,1.75rem)] font-extrabold tracking-[-0.02em] text-white">
                      {rung.payout.value}
                    </p>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex justify-center sm:mt-10">
          <Link
            href={ctaHref}
            className="l-cta inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-bold sm:px-7 sm:text-[15px]"
          >
            Start Your $50K Challenge
            <span className="h-4 w-4">
              <IconArrowRight />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
