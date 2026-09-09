"use client";

import { useRef, useState } from "react";
import { GROUPS, type Group, type Topic } from "./data";
import { GROUP_ICONS, TOPIC_ICONS, IconArrowRight } from "./icons";

/** One selectable group card. Reads "View rules" until open, then "Close". */
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
  const n = group.topics.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls="rules-panel"
      className={[
        "group rounded-xl border bg-white p-5 text-left transition-all sm:p-6",
        selected
          ? "border-[var(--l-blue-500)] shadow-[0_10px_30px_-18px_rgba(47,111,208,0.45)]"
          : "border-[var(--l-line)] hover:border-[var(--l-blue-500)]/45 hover:shadow-[0_10px_30px_-18px_rgba(10,35,66,0.3)]",
      ].join(" ")}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-b from-[var(--l-navy-700)] to-[var(--l-navy-800)] p-2.5 text-white">
        <Icon />
      </span>

      <h3 className="mt-4 text-[14px] font-extrabold tracking-[0.04em] text-[var(--l-ink)] uppercase sm:text-[15px]">
        {group.title}
      </h3>

      <p className="mt-1.5 text-[12.5px] text-[var(--l-body)]">
        {n} {n === 1 ? "topic" : "topics"}
      </p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.14em] text-[var(--l-blue-500)] uppercase">
        {selected ? "Close" : "View rules"}
        <span className="h-3 w-3 transition-transform group-hover:translate-x-0.5">
          <IconArrowRight />
        </span>
      </span>
    </button>
  );
}

/** A topic row that expands to reveal its rule text. */
function TopicRow({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false);
  const Icon = TOPIC_ICONS[topic.icon];
  const panelId = `topic-${topic.id}`;

  return (
    <li className="overflow-hidden rounded-lg border border-[var(--l-line)] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--l-blue-500)]/10 p-1.5 text-[var(--l-blue-500)]">
          <Icon />
        </span>

        <span className="flex-1 text-[14px] font-bold text-[var(--l-ink)] sm:text-[15px]">
          {topic.title}
        </span>

        {/* Plus that becomes a minus when open. */}
        <span aria-hidden className="relative h-4 w-4 shrink-0 text-[var(--l-body)]">
          <span className="absolute top-1/2 left-0 h-[1.5px] w-4 -translate-y-1/2 rounded bg-current" />
          <span
            className={[
              "absolute top-0 left-1/2 h-4 w-[1.5px] -translate-x-1/2 rounded bg-current transition-opacity",
              open ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-[var(--l-line)] px-4 py-5 sm:px-5">
          <p className="text-[13.5px] leading-relaxed text-[var(--l-body)] sm:text-[14.5px]">
            {topic.body}
          </p>

          {topic.points && (
            <ul className="mt-4 space-y-2.5">
              {topic.points.map((p) => (
                <li key={p} className="flex gap-3 text-[13.5px] leading-relaxed text-[var(--l-body)]">
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--l-blue-500)]"
                  />
                  {p}
                </li>
              ))}
            </ul>
          )}

          {topic.facts && (
            <dl className="mt-5 overflow-hidden rounded-lg border border-[var(--l-line)]">
              {topic.facts.map((f, i) => (
                <div
                  key={f.label}
                  className={[
                    "flex flex-col gap-0.5 px-4 py-2.5 xs:flex-row xs:items-center xs:justify-between xs:gap-4",
                    i % 2 ? "bg-white" : "bg-[var(--l-paper-2)]",
                  ].join(" ")}
                >
                  <dt className="text-[12.5px] text-[var(--l-body)]">{f.label}</dt>
                  <dd className="nums text-[12.5px] font-bold text-[var(--l-ink)] xs:text-right">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Rules browser: pick a group above, then expand the topics that appear below.
 *
 * Each topic keeps its own open state, so several can be read at once and a
 * topic collapses back when its group is closed and reopened. Choosing a group
 * moves focus to the panel, so keyboard and screen-reader users are taken to
 * the content they just asked for rather than being left on the card.
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
          /* `key` remounts the panel per group, which resets every topic to
             collapsed instead of carrying one group's open rows into the next. */
          <section
            key={group.id}
            className="rounded-xl border border-[var(--l-line)] bg-white p-5 sm:p-8"
          >
            <h2 className="text-[clamp(1.2rem,3.2vw,1.6rem)] font-extrabold tracking-[0.02em] text-[var(--l-ink)] uppercase">
              {group.title}
            </h2>

            <ul className="mt-5 space-y-3 sm:mt-6">
              {group.topics.map((t) => (
                <TopicRow key={t.id} topic={t} />
              ))}
            </ul>
          </section>
        ) : (
          <p className="rounded-xl border border-[var(--l-line)] bg-white px-6 py-10 text-center text-[10.5px] font-bold tracking-[0.16em] text-[var(--l-body)]/70 uppercase">
            Select a group above to view its rules
          </p>
        )}
      </div>
    </>
  );
}
