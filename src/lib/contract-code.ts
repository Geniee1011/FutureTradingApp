import type { InstrumentCategory } from "./types";

/* Approximate front-month contract code (ES → ESM6) for mock mode / fallback.
   When the backend is connected, accurate codes come from /api/instruments.
   Month codes Jan..Dec = F G H J K M N Q U V X Z. */
const MONTH_CODES = ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"];

function cycleMonths(category: InstrumentCategory): number[] {
  if (category === "Energy") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (category === "Metals") return [2, 4, 6, 8, 10, 12];
  return [3, 6, 9, 12]; // Equity Index quarterly
}

export function computeContractCode(root: string, category: InstrumentCategory, date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const months = cycleMonths(category);
  const rollDay = category === "Energy" ? 1 : 16;

  let activeMonth = months[0];
  let activeYear = year + 1;
  for (let i = 0; i < 24; i++) {
    const m = ((month - 1 + i) % 12) + 1;
    const y = year + Math.floor((month - 1 + i) / 12);
    if (!months.includes(m)) continue;
    if (i === 0 && day >= rollDay) continue;
    activeMonth = m;
    activeYear = y;
    break;
  }
  return `${root}${MONTH_CODES[activeMonth - 1]}${activeYear % 10}`;
}
