const messageDayLabel = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function messageDayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function MessageDay({ value }: { value: string }) {
  return (
    <div className="col-span-full flex items-center justify-center gap-3 py-2" role="separator">
      <span className="hidden h-px min-w-0 flex-1 bg-gradient-to-r from-transparent to-border/80 max-sm:block" aria-hidden="true" />
      <time
        className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-medium text-muted shadow-[0_2px_10px_rgba(11,11,63,0.04)] backdrop-blur-md max-sm:shrink-0 max-sm:rounded-none max-sm:bg-transparent max-sm:px-0 max-sm:shadow-none max-sm:backdrop-blur-none"
        dateTime={value}
      >
        {messageDayLabel.format(new Date(value))}
      </time>
      <span className="hidden h-px min-w-0 flex-1 bg-gradient-to-l from-transparent to-border/80 max-sm:block" aria-hidden="true" />
    </div>
  );
}
