import { REVIEWS, type Review } from "./data";
import { IconQuote, IconStar } from "./icons";

function ReviewCard({ quote, name }: Review) {
  return (
    <figure className="flex w-[260px] shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:w-[320px] sm:p-6">
      <span className="h-4 w-4 text-[var(--l-blue-400)]" aria-hidden>
        <IconQuote />
      </span>
      <blockquote className="mt-3.5 flex-1 text-[13px] leading-relaxed text-white/80 sm:text-[13.5px]">
        {quote}
      </blockquote>
      <div className="mt-5 flex gap-1 text-[var(--l-blue-400)]" aria-label="Rated 5 out of 5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="h-3 w-3">
            <IconStar />
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-[10.5px] font-semibold tracking-[0.14em] text-white/45 uppercase">
        {name}
      </figcaption>
    </figure>
  );
}

/**
 * One auto-sliding row.
 *
 * The keyframe translates 0 → -50%, which travels **left**; `reverse` plays it
 * -50% → 0 to travel **right**. The list is duplicated inline so either
 * direction wraps seamlessly — at -50% the second copy sits exactly where the
 * first began, making the loop point invisible.
 *
 * `delay` offsets where a row starts in its cycle, so the three rows do not
 * line up on load. It is negative so the row is already mid-travel on the first
 * paint rather than pausing before it starts.
 */
function Row({
  items,
  duration,
  direction,
  delay,
}: {
  items: Review[];
  duration: string;
  direction: "left" | "right";
  delay: string;
}) {
  return (
    <div className="l-rail overflow-hidden">
      <ul
        className="l-track flex w-max items-stretch gap-4 sm:gap-5"
        style={{
          ["--l-dur" as string]: duration,
          animationDirection: direction === "right" ? "reverse" : "normal",
          animationDelay: delay,
        }}
      >
        {[...items, ...items].map((r, i) => (
          <li key={`${r.name}-${i}`} className="flex" aria-hidden={i >= items.length}>
            <ReviewCard {...r} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Social proof: three rows of reviews sliding continuously in alternating
 * directions — right, left, right — pausing on hover.
 */
export function Reviews() {
  const n = Math.ceil(REVIEWS.length / 3);
  const rows = [REVIEWS.slice(0, n), REVIEWS.slice(n, n * 2), REVIEWS.slice(n * 2)];

  return (
    <section id="reviews" className="l-grid overflow-hidden py-20 sm:py-28">
      <header className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <h2 className="text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.14] font-extrabold tracking-[-0.025em] text-white">
          What people say about
          <br />
          <span className="l-serif font-normal">The Vault</span>
        </h2>
      </header>

      <div className="mt-12 space-y-4 sm:mt-14 sm:space-y-5">
        <Row items={rows[0]} duration="80s" direction="right" delay="-12s" />
        <Row items={rows[1]} duration="95s" direction="left" delay="-40s" />
        <Row items={rows[2]} duration="88s" direction="right" delay="-26s" />
      </div>
    </section>
  );
}
