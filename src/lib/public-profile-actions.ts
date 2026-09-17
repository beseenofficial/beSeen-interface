export const ACTION_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:not-disabled:-translate-y-px active:not-disabled:translate-y-0';

export const PRIMARY_ACTION = `${ACTION_BASE} group min-h-12 bg-[#22252a] px-6 text-white shadow-[0_1px_2px_rgb(11_11_63/16%),0_12px_26px_-12px_rgb(11_11_63/38%)] hover:bg-brand hover:shadow-[0_2px_3px_rgb(16_69_245/18%),0_14px_28px_-12px_rgb(16_69_245/48%)]`;
export const SECONDARY_ACTION = `${ACTION_BASE} min-h-11 border border-transparent bg-transparent px-4 font-medium text-secondary hover:border-hairline/70 hover:bg-white/80 hover:text-navy`;
export const HEADER_ACTION = `${ACTION_BASE} min-h-10 border border-transparent bg-transparent px-3.5 text-secondary hover:border-hairline hover:bg-white hover:text-navy max-sm:px-3`;

export function formatCount(value: number | undefined) {
  return value === undefined ? '—' : value.toLocaleString();
}

export function getProfileUrl(username: string, origin: string) {
  return `${origin}/u/${username}`;
}
