import Link from "next/link";
import { STEPS } from "./data";
import { StepMock } from "./StepCards";
import { IconArrowRight } from "./icons";

/**
 * The five-step journey.
 *
 * From `lg` this is a centre rail with ringed markers and the mock card and
 * copy alternating sides. Below that the rail moves to the left edge and every
 * row stacks card-over-copy in reading order, since side-by-side halves would
 * squeeze both to nothing on a phone.
 */
export function FiveSteps({ ctaHref }: { ctaHref: string }) {
  return (
    <section id="how" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.12] font-extrabold tracking-[-0.03em] text-[var(--l-ink)]">
            Five Steps. One Funded Account.{" "}
            <span className="l-serif font-normal">Zero Surprises.</span>
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[var(--l-body)] sm:text-[15.5px]">
            We&rsquo;re not just another prop firm — we&rsquo;re building the new standard for
            serious futures traders.
          </p>
        </header>

        <ol className="relative mt-14 sm:mt-16">
          <span
            aria-hidden
            className="absolute top-2 bottom-2 left-[7px] w-px bg-[var(--l-line)] lg:left-1/2 lg:-translate-x-1/2"
          />

          {STEPS.map((s, i) => {
            const flip = i % 2 === 1;
            return (
              <li
                key={s.n}
                className="relative pb-12 pl-8 sm:pb-16 sm:pl-12 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-10 lg:pl-0"
              >
                {/* Mock card. */}
                <div
                  className={[
                    "w-full max-w-[420px] lg:max-w-none",
                    flip ? "lg:order-3" : "lg:order-1",
                  ].join(" ")}
                >
                  <StepMock card={s.card} />
                </div>

                {/* Rail marker. */}
                <span
                  aria-hidden
                  className="absolute top-2 left-0 z-10 h-3.5 w-3.5 rounded-full border-2 border-[var(--l-red)] bg-white sm:h-4 sm:w-4 lg:relative lg:top-auto lg:left-auto lg:order-2 lg:h-4 lg:w-4"
                />

                {/* Copy. */}
                <div
                  className={[
                    "mt-6 lg:mt-0",
                    flip ? "lg:order-1 lg:text-right" : "lg:order-3",
                  ].join(" ")}
                >
                  <p className="l-serif text-[26px] leading-none text-[var(--l-ink)] sm:text-[32px]">
                    {s.n}
                  </p>
                  <h3 className="mt-3 text-[17px] font-bold tracking-[-0.01em] text-[var(--l-ink)] sm:text-[19px]">
                    {s.title}
                  </h3>
                  <p
                    className={[
                      "mt-3 max-w-md text-[13.5px] leading-relaxed text-[var(--l-body)] sm:text-[14.5px]",
                      flip ? "lg:ml-auto" : "",
                    ].join(" ")}
                  >
                    {s.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex justify-center">
          <Link
            href={ctaHref}
            className="l-cta inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-bold sm:px-7 sm:text-[15px]"
          >
            Start Your Journey
            <span className="h-4 w-4">
              <IconArrowRight />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
