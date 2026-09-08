"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * The site's only navigation, at every width — the header shows just the
 * wordmark and this toggle, and the links live in the dropdown it opens.
 *
 * The panel spans the full width of the header it hangs from, with its contents
 * centred, and is sized to those contents rather than to the viewport.
 * Closes on navigation, on Escape and on a backdrop click; locks background
 * scroll while open and returns focus to the toggle on close.
 */
export function NavMenu({
  links,
  isAuthed,
  homeHref,
}: {
  links: { href: string; label: string }[];
  isAuthed: boolean;
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="l-nav-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--l-ink)]"
      >
        <span aria-hidden className="relative block h-3.5 w-[22px]">
          <span
            className={[
              "absolute left-0 block h-[2px] w-full rounded bg-current transition-transform duration-200",
              open ? "top-1.5 rotate-45" : "top-0",
            ].join(" ")}
          />
          <span
            className={[
              "absolute top-1.5 left-0 block h-[2px] w-full rounded bg-current transition-opacity duration-200",
              open ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
          <span
            className={[
              "absolute left-0 block h-[2px] w-full rounded bg-current transition-transform duration-200",
              open ? "top-1.5 -rotate-45" : "top-3",
            ].join(" ")}
          />
        </span>
      </button>

      {open && (
        <>
          {/* Washes out the page behind the card, as in the design. */}
          <div
            className="fixed inset-0 top-14 z-30 bg-white/70 backdrop-blur-[2px] sm:top-16"
            onClick={close}
            aria-hidden
          />

          <div
            id="l-nav-menu"
            className="fixed inset-x-0 top-14 z-40 border-b border-[var(--l-line)] bg-white px-6 py-9 shadow-[0_24px_60px_-24px_rgba(10,35,66,0.28)] sm:top-16"
          >
            <ul className="flex flex-col items-center gap-8">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={close}
                    className="text-[12.5px] font-bold tracking-[0.16em] text-[var(--l-ink)] uppercase transition-opacity hover:opacity-60"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex justify-center">
              <Link
                href={isAuthed ? homeHref : "/register"}
                onClick={close}
                className="rounded-full bg-[var(--l-red)] px-7 py-3.5 text-[12.5px] font-bold tracking-[0.14em] text-white uppercase transition-transform hover:-translate-y-0.5"
              >
                {isAuthed ? "Go to portal" : "Get funded"}
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
