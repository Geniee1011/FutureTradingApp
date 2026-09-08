import Link from "next/link";
import { Img } from "./Img";
import { FEATURED_TRADER, MOSAIC_LEFT, MOSAIC_RIGHT } from "./data";
import { IconCheck, IconArrowRight, IconArrowUpRight } from "./icons";

/**
 * Verified badge, inset inside the bottom-right corner of a mosaic tile.
 *
 * It sits on the photo rather than straddling the edge, so it needs no ring to
 * separate it from the background — just a soft shadow to hold its edge against
 * the lighter photos.
 */
function Verified() {
  return (
    <span className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--l-red)] p-1 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:right-2.5 sm:bottom-2.5 sm:h-7 sm:w-7 sm:p-1.5">
      <IconCheck />
    </span>
  );
}

/** Staggered offsets give the wall its scattered look at `lg`. */
const OFFSETS = ["mt-8", "mt-0", "mt-14", "mt-4", "mt-20", "mt-10"];

/**
 * A mosaic tile.
 *
 * The badge is positioned against an inner wrapper that hugs the photo, not
 * against the grid cell. Cells stretch to the tallest tile in their row, and
 * each tile carries a different top offset — anchoring to the cell would leave
 * the badge floating below the photo by a different amount on every tile.
 */
function Tile({ src, offset }: { src: string; offset: string }) {
  return (
    <div className={offset}>
      <div className="relative">
        <Img
          src={src}
          alt=""
          label={src.split("/").pop()}
          tone="dark"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 150px"
          className="aspect-[4/5] w-full rounded-xl border-white/10"
        />
        <Verified />
      </div>
    </div>
  );
}

/**
 * The funded-trader wall.
 *
 * At `lg` this is three tracks — scattered tiles, the featured trader, more
 * scattered tiles. Below that the stagger is dropped and everything collapses
 * into an even grid with the featured trader leading, which keeps the tiles
 * large enough to read on a phone.
 */
export function TopTraders({ ctaHref }: { ctaHref: string }) {
  return (
    <section id="traders" className="l-grid overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="inline-block rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11.5px] font-semibold text-white/75">
            Top Traders
          </p>
          <h2 className="mt-5 text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.14] font-extrabold tracking-[-0.025em] text-white">
            Traders Who Scaled
            <br />
            <span className="l-serif font-normal">With The Vault</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-white/55 sm:text-[15.5px]">
            From first funding to $1,000,000 accounts. These traders proved it&rsquo;s possible.
          </p>

          <div className="mt-7 flex justify-center">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-bold text-[var(--l-ink)] transition-transform hover:-translate-y-0.5"
            >
              Get Funded Now
              <span className="h-4 w-4">
                <IconArrowRight />
              </span>
            </Link>
          </div>
        </header>

        <div className="mt-12 grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-16 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          {/* Left cluster — hidden below lg, where it folds into the flat grid. */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-3 lg:items-start">
            {MOSAIC_LEFT.map((src, i) => (
              <Tile key={src} src={src} offset={OFFSETS[i % OFFSETS.length]} />
            ))}
          </div>

          {/* Featured trader. */}
          <figure className="col-span-2 sm:col-span-3 lg:col-span-1 lg:w-[220px]">
            <div className="relative">
              <Img
                src={FEATURED_TRADER.src}
                alt={FEATURED_TRADER.name}
                label="trader-center.jpg"
                tone="dark"
                sizes="(max-width: 1024px) 92vw, 220px"
                className="aspect-[4/5] w-full rounded-2xl border-2 border-white"
              />
              <span className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--l-blue-600)] p-2 text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                <IconArrowUpRight />
              </span>
            </div>
            <figcaption className="mt-4 text-center">
              <p className="text-[16px] font-bold text-white">{FEATURED_TRADER.name}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-[var(--l-blue-300)] uppercase">
                {FEATURED_TRADER.role}
              </p>
            </figcaption>
          </figure>

          <div className="hidden gap-4 lg:grid lg:grid-cols-3 lg:items-start">
            {MOSAIC_RIGHT.map((src, i) => (
              <Tile key={src} src={src} offset={OFFSETS[(i + 3) % OFFSETS.length]} />
            ))}
          </div>

          {/* Flat grid below lg. */}
          {[...MOSAIC_LEFT, ...MOSAIC_RIGHT].map((src) => (
            <div key={src} className="relative lg:hidden">
              <Img
                src={src}
                alt=""
                label={src.split("/").pop()}
                tone="dark"
                sizes="(max-width: 640px) 45vw, 30vw"
                className="aspect-[4/5] w-full rounded-xl border-white/10"
              />
              <Verified />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
