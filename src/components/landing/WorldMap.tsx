import { Img } from "./Img";

/** Global reach: the dotted map with its located pins. */
export function WorldMap() {
  return (
    <section className="bg-white pb-16 sm:pb-24">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="l-serif text-[15px] text-[var(--l-body)] sm:text-[16px]">Worldwide</p>
          <h2 className="mt-2.5 text-[clamp(1.7rem,4.6vw,2.8rem)] leading-[1.1] font-extrabold tracking-[-0.03em]">
            <span className="text-[var(--l-red)]">One platform.</span>{" "}
            <span className="text-[var(--l-ink)]">52 Countries.</span>
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[var(--l-body)] sm:text-[15.5px]">
            Funded traders on every continent. No borders, no exceptions.
          </p>
        </header>

        {/* The map is wide and detailed; below `sm` it scrolls rather than
            shrinking the pin labels into illegibility. */}
        <div className="mt-10 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:mt-12 sm:overflow-visible sm:px-0">
          <Img
            src="/landing/world-map.png"
            alt="World map with funded traders marked in Los Angeles, New York, São Paulo, Frankfurt, Moscow, Dubai, Cape Town and Sydney"
            label="world-map.png"
            fit="contain"
            sizes="(max-width: 640px) 720px, (max-width: 1200px) 100vw, 1180px"
            className="h-[240px] w-[720px] border-0 bg-transparent sm:h-auto sm:aspect-[1376/768] sm:w-full"
          />
        </div>
      </div>
    </section>
  );
}
