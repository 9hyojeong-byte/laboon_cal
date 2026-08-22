// Single source of truth for 벙 타입 colors, shared by the calendar (dots +
// legend) and the event form (selected-button highlight) so they always
// match.
export const GATHERING_TYPE_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  '트레이닝': { dot: 'bg-sky-500', bg: 'bg-sky-50/70', text: 'text-sky-700', border: 'border-sky-200/50' },
  '같이가요': { dot: 'bg-rose-500', bg: 'bg-rose-50/70', text: 'text-rose-700', border: 'border-rose-200/50' },
  '교육': { dot: 'bg-amber-500', bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200/50' },
  '투어': { dot: 'bg-violet-500', bg: 'bg-violet-50/70', text: 'text-violet-700', border: 'border-violet-200/50' },
  '기타': { dot: 'bg-slate-400', bg: 'bg-slate-50/70', text: 'text-slate-655', border: 'border-slate-200/50' },
};

export function getGatheringTypeDotClass(type: string | null | undefined): string {
  if (!type) return 'bg-slate-400';
  return GATHERING_TYPE_COLORS[type]?.dot || 'bg-slate-400';
}
