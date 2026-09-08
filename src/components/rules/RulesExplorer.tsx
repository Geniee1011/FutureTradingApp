"use client";

import { useRef, useState } from "react";
import { GROUPS, type Group } from "./data";
import { GROUP_ICONS, IconArrowRight } from "./icons";

/** One selectable group card. */
function GroupCard({
  group,
  selected,
  onSelect,
}: {
  group: Group;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = GROUP_ICONS[group.icon];
  const n = group.rules.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls="rules-panel"
      className={[
        "group rounded-xl border bg-white p-5 text-left transition-all sm:p-6",
        selected
          ? "border-[var(--l-red)]/50 shadow-[0_10px_30px_-16px_rgba(10,35,66,0.35)]"
          : "border-[var(--l-line)] hover:border-[var(--l-blue-500)]/45 hover:shadow-[0_10px_30px_-18px_rgba(10,35,66,0.3)]",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 items-center justify-center rounded-lg p-2.5 text-white transition-colors",
          selected ? "bg-[var(--l-red)]" : "bg-[var(--l-navy-700)]",
        ].join(" ")}
      >
        <Icon />
      </span>

      <h3 className="mt-4 text-[14px] font-extrabold tracking-[0.04em] text-[var(--l-ink)] uppercase sm:text-[15px]">
        {group.title}
      </h3>

      <p className="mt-1.5 text-[12.5px] text-[var(--l-blue-500)]">
        {n} {n === 1 ? "topic" : "topics"}
      </p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.14em] text-[var(--l-blue-500)] uppercase">
        View rules
        <span className="h-3 w-3 transition-transform group-hover:translate-x-0.5">
          <IconArrowRight />
        </span>
      </span>
    </button>
  );
}

/**
 * Rules browser: pick a group above, read its rules below.
 *
 * Selection lives here rather than in the URL because the panel sits on the
 * same screen as the cards — there is nothing to deep-link to yet. Choosing a
 * group moves focus to the panel so keyboard and screen-reader users are taken
 * to the content they just asked for, instead of being left on the card.
 */
export function RulesExplorer() {
  const [selected, setSelected] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const group = GROUPS.find((g) => g.id === selected) ?? null;

  function choose(id: string) {
    const next = id === selected ? null : id;
    setSelected(next);
    if (next) requestAnimationFrame(() => panelRef.current?.focus());
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {GROUPS.map((g) => (
          <GroupCard key={g.id} group={g} selected={g.id === selected} onSelect={() => choose(g.id)} />
        ))}
      </div>

      <div
        id="rules-panel"
        ref={panelRef}
        tabIndex={-1}
        aria-live="polite"
        className="mt-6 scroll-mt-24 outline-none sm:mt-8"
      >
        {group ? (
          <article className="rounded-xl border border-[var(--l-line)] bg-white p-6 sm:p-8">
            <header className="border-b border-[var(--l-line)] pb-6">
              <h2 className="text-[clamp(1.15rem,3vw,1.5rem)] font-extrabold tracking-[0.02em] text-[var(--l-ink)] uppercase">
                {group.title}
              </h2>
              <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[var(--l-body)] sm:text-[14.5px]">
                {group.blurb}
              </p>
            </header>

            <ol className="divide-y divide-[var(--l-line)]">
              {group.rules.map((r, i) => (
                <li key={r.title} className="py-6 last:pb-0">
                  <div className="flex gap-4">
                    <span className="nums mt-0.5 shrink-0 text-[12px] font-bold text-[var(--l-blue-500)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold text-[var(--l-ink)] sm:text-[16px]">
                        {r.title}
                      </h3>
                      <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--l-body)] sm:text-[14.5px]">
                        {r.body}
                      </p>

                      {r.facts && (
                        <dl className="mt-4 overflow-hidden rounded-lg border border-[var(--l-line)]">
                          {r.facts.map((f, j) => (
                            <div
                              key={f.label}
                              className={[
                                "flex items-center justify-between gap-4 px-4 py-2.5",
                                j % 2 ? "bg-white" : "bg-[var(--l-paper-2)]",
                              ].join(" ")}
                            >
                              <dt className="text-[12.5px] text-[var(--l-body)]">{f.label}</dt>
                              <dd className="nums text-right text-[12.5px] font-bold text-[var(--l-ink)]">
                                {f.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        ) : (
          <p className="rounded-xl border border-[var(--l-line)] bg-white px-6 py-10 text-center text-[10.5px] font-bold tracking-[0.16em] text-[var(--l-body)]/70 uppercase">
            Select a group above to view its rules
          </p>
        )}
      </div>
    </>
  );
}
