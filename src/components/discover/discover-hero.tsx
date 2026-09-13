import { Search } from 'lucide-react';
import { AuraCardStack } from './aura-card-stack';
import { BrushUnderline } from './brush-underline';

export function DiscoverHero({
  disabled,
  fullBleed,
  onSearchChange,
  search,
}: {
  disabled: boolean;
  fullBleed: boolean;
  onSearchChange: (value: string) => void;
  search: string;
}) {
  return (
    <header
      className={`discover-hero relative -mt-5 mb-8 min-h-[430px] overflow-hidden rounded-[32px] border border-[#d4dfef] bg-[#f7fbff] text-navy max-sm:-mt-4 max-sm:rounded-3xl ${fullBleed ? 'left-1/2 w-[calc(100dvw-32px)] max-w-[1580px] -translate-x-1/2' : 'mx-auto w-[calc(100%-24px)]'}`}
    >
      <img
        className="pointer-events-none absolute right-10 top-8 h-20 w-auto opacity-55 max-sm:hidden"
        src="/brand/discover-card-dot-grid.svg"
        alt=""
        aria-hidden="true"
      />

      <div className="relative z-10 grid min-h-[430px] grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)] items-center gap-12 px-[clamp(28px,5vw,72px)] py-12 max-lg:grid-cols-1 max-lg:gap-8 max-sm:px-5 max-sm:py-7">
        <div className="min-w-0">
          <h1 className="max-w-[760px] text-[clamp(42px,5.2vw,70px)] font-semibold leading-[0.98] tracking-[-0.04em] text-navy">
            Find the right person.
            <br />
            <span className="relative inline-block text-brand">
              Start
              <BrushUnderline />
            </span>{' '}
            the conversation.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-secondary max-sm:mt-4">
            BeSeen is an open network of public identities. Search anyone by
            username, check their signals, and reach the right profile.
          </p>

          <label className="mt-7 flex min-h-[68px] max-w-3xl items-center gap-4 rounded-[20px] border border-[#d7dfec] bg-white p-2 pl-5 text-secondary shadow-[0_10px_28px_rgba(35,58,115,0.07)] transition focus-within:border-[#b6c7f3] focus-within:shadow-[0_12px_32px_rgba(16,69,245,0.1)] max-sm:min-h-14 max-sm:rounded-2xl max-sm:pl-4">
            <Search size={21} aria-hidden="true" />
            <span className="sr-only">Search people</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-navy caret-brand outline-none placeholder:text-muted"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by @username"
              type="search"
              value={search}
              disabled={disabled}
            />
            <span
              className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_rgba(16,69,245,0.22)] max-sm:size-10"
              aria-hidden="true"
            >
              <Search size={21} />
            </span>
          </label>
        </div>

        <aside className="relative mx-auto w-full max-w-[440px]">
          <p className="sr-only">Aura identity cards in motion.</p>
          <AuraCardStack />
        </aside>
      </div>
    </header>
  );
}
