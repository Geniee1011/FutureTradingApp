# Landing page assets

All assets are in place. This records where each one is used, so a future
replacement lands in the right slot. Paths are referenced from
`src/components/landing/`.

## Brand

| File                  | Used by                                    |
| --------------------- | ------------------------------------------ |
| `vault-logo.png`      | `LandingNav`, `LandingFooter` — wordmark    |
| `signature-white.png` | `LandingFooter` — founder signature (navy)  |
| `signature.png`       | *spare* — dark-on-light signature variant   |

## Hero

| File                 | Used by                                 |
| -------------------- | --------------------------------------- |
| `vault-warrior.png`  | `Hero` — blue equestrian statue          |

## Vault imagery

| File                          | Used by                                          |
| ----------------------------- | ------------------------------------------------ |
| `vault-payouts-bg.jpg`        | `TierLadder` — dark navy hall, band background    |
| `vault-hero.jpg`              | `PayoutBand` — painterly vault, band background   |
| `vault-certificate-bg.webp`   | `Differentiators` — sepia bank vault, band bg     |
| `vault-marble.jpg`            | `HowItWorks` step 01                              |
| `vault-payouts-bg-bright.jpg` | `HowItWorks` step 02 — blue-lit hall              |
| `vault-payouts-bg-v2.jpg`     | `HowItWorks` step 03 — gold arched door           |
| `vault-hero-wide.jpg`         | `HowItWorks` step 04 — vault spilling coins       |
| `vault-hero.png`              | `GetStarted` — cartoon vault (transparent)        |

## Social proof

| File                            | Used by                              |
| ------------------------------- | ------------------------------------ |
| `mike-richards-gold-record.png` | `PayoutBand` — Two Comma Club, 2025   |
| `nicole-shear-gold-record.png`  | `PayoutBand` — Two Comma Club, 2024   |
| `world-map.png`                 | `StatsBand` — dotted map behind stats |

## Testimonial avatars

`trader-1.png`, `trader-2.png`, `trader-3.png` → `Testimonials`, in that order.

## Trader collage

`TraderCollage` splits `COLLAGE` (in `data.ts`) across two drifting rows:

`trader-photo-0.jpeg` … `trader-photo-5.jpeg`, `trader-photo-6.jpg` …
`trader-photo-10.jpg`, `trader-bl.jpg`, `trader-center.jpg` — 13 images.

> `trader-mobile-center.jpg` in the source folder is byte-identical to
> `trader-bl.jpg` (SHA256 `4930A512…`), so it is intentionally not included.
