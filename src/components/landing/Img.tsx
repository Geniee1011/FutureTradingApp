"use client";

import { useState } from "react";
import NextImage from "next/image";
import { cn } from "@/lib/utils";

export interface ImgProps {
  /** Path under /public, e.g. "/landing/vault-warrior.png". */
  src: string;
  alt: string;
  /** Short caption shown in the placeholder if the file is ever missing. */
  label?: string;
  /** `cover` fills and crops, `contain` fits the whole image in. */
  fit?: "cover" | "contain";
  /**
   * Rendered width hint for the optimiser. Several source assets are multi-MB
   * originals (the headshots are ~2.9MB but draw at 44px), so an accurate
   * `sizes` is what keeps the page light — without it Next ships a far larger
   * candidate than the slot needs.
   */
  sizes?: string;
  /** Wrapper classes — set the box size here. */
  className?: string;
  imgClassName?: string;
  /** Placeholder tint. `light` on white sections, `dark` on navy ones. */
  tone?: "light" | "dark";
  priority?: boolean;
}

/**
 * Marketing image.
 *
 * Uses `next/image` with `fill`, so the wrapper's box drives the layout and the
 * optimiser serves a correctly-sized AVIF/WebP. Assets and their slots are
 * catalogued in `public/landing/MANIFEST.md`.
 *
 * If a file is ever missing or fails to decode, this falls back to a
 * palette-matched block naming the asset rather than a broken-image icon, so a
 * swapped-out asset degrades visibly but harmlessly.
 */
export function Img({
  src,
  alt,
  label,
  fit = "cover",
  sizes = "100vw",
  className,
  imgClassName,
  tone = "light",
  priority,
}: ImgProps) {
  const [failed, setFailed] = useState(false);
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        failed && (dark ? "l-ph-dark border border-white/10" : "l-ph-light border border-[var(--l-line)]"),
        className,
      )}
    >
      {failed ? (
        <span
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center",
            dark ? "text-white/45" : "text-[var(--l-body)]/55",
          )}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-5 w-5 opacity-70"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="m3 16 5-4 4 3 3-2 6 5" />
          </svg>
          <span className="text-[9.5px] leading-tight font-semibold tracking-wide break-all uppercase">
            {label ?? alt}
          </span>
        </span>
      ) : (
        <NextImage
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className={cn(fit === "cover" ? "object-cover" : "object-contain", imgClassName)}
        />
      )}
    </div>
  );
}
