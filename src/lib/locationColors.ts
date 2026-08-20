export const LOCATION_COLORS = {
  '딥스': {
    bg: 'bg-[#3B82F6]',
    text: 'text-[#3B82F6]',
    border: 'border-[#3B82F6]',
    hoverBorder: 'hover:border-[#3B82F6]',
    hoverText: 'hover:text-[#3B82F6]',
  },
  '파라': {
    bg: 'bg-[#EF4444]',
    text: 'text-[#EF4444]',
    border: 'border-[#EF4444]',
    hoverBorder: 'hover:border-[#EF4444]',
    hoverText: 'hover:text-[#EF4444]',
  },
  '밀양': {
    bg: 'bg-[#14B8A6]',
    text: 'text-[#14B8A6]',
    border: 'border-[#14B8A6]',
    hoverBorder: 'hover:border-[#14B8A6]',
    hoverText: 'hover:text-[#14B8A6]',
  },
  '북항': {
    bg: 'bg-[#06B6D4]',
    text: 'text-[#06B6D4]',
    border: 'border-[#06B6D4]',
    hoverBorder: 'hover:border-[#06B6D4]',
    hoverText: 'hover:text-[#06B6D4]',
  },
  '패나': {
    bg: 'bg-[#D946EF]',
    text: 'text-[#D946EF]',
    border: 'border-[#D946EF]',
    hoverBorder: 'hover:border-[#D946EF]',
    hoverText: 'hover:text-[#D946EF]',
  },
  '풀6': {
    bg: 'bg-[#84CC16]',
    text: 'text-[#84CC16]',
    border: 'border-[#84CC16]',
    hoverBorder: 'hover:border-[#84CC16]',
    hoverText: 'hover:text-[#84CC16]',
  },
  '두류': {
    bg: 'bg-[#F59E0B]',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]',
    hoverBorder: 'hover:border-[#F59E0B]',
    hoverText: 'hover:text-[#F59E0B]',
  },
  '문수': {
    bg: 'bg-[#F43F5E]',
    text: 'text-[#F43F5E]',
    border: 'border-[#F43F5E]',
    hoverBorder: 'hover:border-[#F43F5E]',
    hoverText: 'hover:text-[#F43F5E]',
  },
  '알프스': {
    bg: 'bg-[#6366F1]',
    text: 'text-[#6366F1]',
    border: 'border-[#6366F1]',
    hoverBorder: 'hover:border-[#6366F1]',
    hoverText: 'hover:text-[#6366F1]',
  },
  '자유일정': {
    bg: 'bg-[#8B5CF6]',
    text: 'text-[#8B5CF6]',
    border: 'border-[#8B5CF6]',
    hoverBorder: 'hover:border-[#8B5CF6]',
    hoverText: 'hover:text-[#8B5CF6]',
  },
} as const;

export type LocationKey = keyof typeof LOCATION_COLORS;

export function getDotColorClass(location: string | null | undefined): string {
  if (!location) return 'bg-slate-400';
  const trimmed = location.trim();
  for (const key of Object.keys(LOCATION_COLORS) as LocationKey[]) {
    if (trimmed.includes(key)) {
      return LOCATION_COLORS[key].bg;
    }
  }
  return 'bg-slate-400';
}
