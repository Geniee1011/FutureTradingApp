import { FAQ } from "./data";

/**
 * FAQ accordion.
 *
 * Built on <details>/<summary> so it opens without client JS and stays
 * keyboard- and screen-reader-navigable by default. The first entry is open, as
 * in the design.
 */
export function Faq() {
  return (
    <section id="faq" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <h2 className="text-center text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.14] font-extrabold tracking-[-0.03em] text-[var(--l-ink)]">
          Frequently
          <br />
          <span className="l-serif font-normal">Asked Questions</span>
        </h2>

        <div className="mt-12 space-y-3 sm:mt-14">
          {FAQ.map((item, i) => (
            <details
              key={item.q}
              open={i === 0}
              className="group rounded-xl border border-[var(--l-line)] bg-white open:bg-[var(--l-paper-2)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
                <span className="text-[14px] font-semibold text-[var(--l-ink)] sm:text-[15px]">
                  {item.q}
                </span>
                {/* Plus that becomes a minus when the entry is open. */}
                <span
                  aria-hidden
                  className="relative h-4 w-4 shrink-0 text-[var(--l-ink)]"
                >
                  <span className="absolute top-1/2 left-0 h-[1.5px] w-4 -translate-y-1/2 rounded bg-current" />
                  <span className="absolute top-0 left-1/2 h-4 w-[1.5px] -translate-x-1/2 rounded bg-current transition-opacity group-open:opacity-0" />
                </span>
              </summary>
              <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-[var(--l-body)] sm:px-6 sm:pb-6 sm:text-[14.5px]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
