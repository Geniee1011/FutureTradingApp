import Link from "next/link";
import { FOOTER_LINKS } from "./data";
import { Img } from "./Img";

export function LandingFooter() {
  return (
    <footer className="l-grid pt-16 pb-10 sm:pt-20">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-y-12">
          <div className="col-span-2">
            <p className="text-[15px] font-extrabold tracking-[0.22em] text-white uppercase">
              The Vault
            </p>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/45 sm:text-[13.5px]">
              Funding futures traders on real CME liquidity. Pass the evaluation, trade our capital,
              keep 100% of what you make.
            </p>
            <Img
              src="/landing/signature-white.png"
              alt="Founder signature"
              label="signature-white.png"
              fit="contain"
              tone="dark"
              sizes="160px"
              className="mt-6 h-12 w-40 border-0 bg-transparent"
            />
          </div>

          {FOOTER_LINKS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-[11px] font-bold tracking-[0.16em] text-white/40 uppercase">
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-white/70 transition-colors hover:text-white sm:text-[13.5px]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-white/35">
            © {new Date().getFullYear()} The Vault. All rights reserved.
          </p>
          <p className="max-w-xl text-[11px] leading-relaxed text-white/30">
            Futures trading carries substantial risk of loss and is not suitable for every investor.
            Evaluation accounts are simulated. Past performance is not indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
}
