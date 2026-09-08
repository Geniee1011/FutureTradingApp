import { CERTIFICATES } from "./data";
import { IconDiamond } from "./icons";

/** One payout certificate, over the vault-door engraving. */
function Certificate({
  amount,
  name,
  date,
  account,
}: {
  amount: string;
  name: string;
  date: string;
  account: string;
}) {
  return (
    <article
      className="l-card-blue relative w-[280px] shrink-0 overflow-hidden rounded-2xl border border-white/12 sm:w-[400px] lg:w-[540px]"
      aria-label={`Payout certificate for ${amount} awarded to ${name}`}
    >
      {/* Engraved vault door behind the certificate face. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/landing/vault-certificate-bg.webp')] bg-cover bg-center opacity-[0.14] mix-blend-luminosity"
      />

      <div className="relative flex flex-col p-5 sm:p-7">
        <p className="flex items-center justify-center gap-1.5 text-[9.5px] font-bold tracking-[0.2em] text-white/85 uppercase sm:text-[10.5px]">
          <span className="h-2 w-2">
            <IconDiamond />
          </span>
          The Vault
        </p>

        <h3 className="mt-4 text-center text-[17px] leading-tight font-extrabold tracking-[0.02em] text-white uppercase sm:mt-5 sm:text-[22px]">
          Payout
          <br />
          Certificate
        </h3>

        <p className="mt-3 text-center text-[10px] text-white/65 sm:text-[11.5px]">
          Proudly certifies that a payout in the amount of
        </p>

        <p className="nums mt-3 rounded-lg border border-white/15 bg-white/10 py-3 text-center text-[22px] font-extrabold tracking-[-0.01em] text-white sm:mt-3.5 sm:py-4 sm:text-[30px]">
          {amount}
        </p>

        <p className="mt-3 text-center text-[10px] text-white/65 sm:text-[11.5px]">Has been awarded to</p>
        <p className="mt-1 text-center text-[13px] font-semibold tracking-[0.06em] text-white uppercase sm:text-[15px]">
          {name}
        </p>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/12 pt-4 sm:mt-8">
          <span className="text-[7.5px] font-semibold tracking-[0.16em] text-white/45 uppercase sm:text-[8.5px]">
            The Vault CEO
          </span>
          <span className="text-center">
            <span className="block text-[7.5px] font-semibold tracking-[0.16em] text-white/45 uppercase sm:text-[8.5px]">
              Date
            </span>
            <span className="nums mt-0.5 block text-[10px] text-white sm:text-[11.5px]">{date}</span>
          </span>
          <span className="text-right">
            <span className="block text-[7.5px] font-semibold tracking-[0.16em] text-white/45 uppercase sm:text-[8.5px]">
              Account size
            </span>
            <span className="nums mt-0.5 block text-[10px] text-white sm:text-[11.5px]">{account}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * Payout proof. The certificates drift horizontally on a rail that runs
 * full-bleed past the container, pausing on hover and for reduced-motion users.
 */
export function Certificates() {
  return (
    <section id="payouts" className="l-grid overflow-hidden py-20 sm:py-28">
      <header className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <h2 className="text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.14] font-extrabold tracking-[-0.025em] text-white">
          Get <span className="l-serif font-normal">paid</span> quickly,
          <br />
          consistently and fair.
        </h2>
      </header>

      <div className="l-rail mt-12 overflow-hidden sm:mt-14">
        <div
          className="l-track flex w-max gap-4 sm:gap-6"
          style={{ ["--l-dur" as string]: "70s" }}
        >
          {[...CERTIFICATES, ...CERTIFICATES].map((c, i) => (
            <Certificate key={`${c.name}-${c.date}-${i}`} {...c} />
          ))}
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-md px-5 text-center text-[13.5px] leading-relaxed text-white/50 sm:mt-14 sm:text-[14.5px]">
        With every payout, our traders move one step closer to the freedom they&rsquo;re working for.
      </p>
    </section>
  );
}
