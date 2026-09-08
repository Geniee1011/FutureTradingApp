import { STEPS } from "./data";
import { STEP_ICONS, IconCheck } from "./icons";

/**
 * "Your journey" rail. Steps read done / current / upcoming from `current`
 * (a zero-based index), with a connector drawn between consecutive markers.
 */
export function JourneySidebar({ current }: { current: number }) {
  return (
    <aside className="rounded-2xl bg-[#eef2f8] p-6 sm:p-7">
      <h2 className="l-serif text-[17px] text-[var(--l-body)]">Your journey</h2>

      <ol className="mt-6 space-y-0">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = STEP_ICONS[s.icon];
          const last = i === STEPS.length - 1;

          return (
            <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
              {/* Connector to the next marker. */}
              {!last && (
                <span
                  aria-hidden
                  className={[
                    "absolute top-10 left-[19px] h-[calc(100%-2.5rem)] w-px",
                    done ? "bg-[var(--l-red)]/40" : "bg-[var(--l-ink)]/12",
                  ].join(" ")}
                />
              )}

              <span
                className={[
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  done
                    ? "bg-[var(--l-red)] p-2.5 text-white"
                    : active
                      ? "border-2 border-[var(--l-red)] bg-white p-2 text-[var(--l-red)]"
                      : "bg-[var(--l-ink)]/[0.06] p-2 text-[var(--l-body)]/60",
                ].join(" ")}
              >
                {done ? <IconCheck /> : <Icon />}
              </span>

              <span className="pt-1">
                <span
                  className={[
                    "block text-[13.5px] font-bold",
                    active || done ? "text-[var(--l-ink)]" : "text-[var(--l-body)]",
                  ].join(" ")}
                >
                  {s.title}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-[var(--l-body)]">
                  Step {i + 1} of {STEPS.length}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
