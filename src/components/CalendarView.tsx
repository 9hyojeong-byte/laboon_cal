import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { isPastDate } from '../lib/timeUtils';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: string;
  events: ScheduleEvent[];
  onSelectDate: (dateStr: string) => void;
  onNavigateMonth: (offset: number) => void;
  selectedGatheringType: string | null;
  onSelectGatheringType: (type: string | null) => void;
  visibleTypes?: string[];
}

const GATHERING_TYPE_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  '트레이닝': { dot: 'bg-sky-500', bg: 'bg-sky-50/70', text: 'text-sky-700', border: 'border-sky-200/50' },
  '같이가요': { dot: 'bg-rose-500', bg: 'bg-rose-50/70', text: 'text-rose-700', border: 'border-rose-200/50' },
  '교육': { dot: 'bg-amber-500', bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200/50' },
  '투어': { dot: 'bg-violet-500', bg: 'bg-violet-50/70', text: 'text-violet-700', border: 'border-violet-200/50' },
  '기타': { dot: 'bg-slate-400', bg: 'bg-slate-50/70', text: 'text-slate-655', border: 'border-slate-200/50' },
};

function getGatheringTypeDotClass(type: string | null | undefined): string {
  if (!type) return 'bg-slate-400';
  return GATHERING_TYPE_COLORS[type]?.dot || 'bg-slate-400';
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onNavigateMonth,
  selectedGatheringType,
  onSelectGatheringType,
  visibleTypes,
}: CalendarViewProps) {
  const legendRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedGatheringType && legendRef.current && !legendRef.current.contains(e.target as Node)) {
        onSelectGatheringType(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedGatheringType, onSelectGatheringType]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday ...

  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  const lastDayOfPrevMonth = new Date(year, month, 0);
  const totalDaysPrev = lastDayOfPrevMonth.getDate();

  const calendarCells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // 1. Fill previous month prefix days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = totalDaysPrev - i;
    const prevMonthDate = new Date(year, month - 1, d);
    calendarCells.push({
      dateStr: formatLocalDate(prevMonthDate),
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // 2. Fill current month days
  for (let i = 1; i <= totalDays; i++) {
    const currDate = new Date(year, month, i);
    calendarCells.push({
      dateStr: formatLocalDate(currDate),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // 3. Fill next month suffix days to complete standard 42-day calendar grid
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    calendarCells.push({
      dateStr: formatLocalDate(nextMonthDate),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm p-4.5 select-none relative overflow-hidden transition-all duration-200">
      
      {/* ── Calendar Navigation Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-medium text-foreground text-lg tracking-tight">
          {year}년 <span className="gradient-text font-display">{month + 1}월</span>
        </h2>
        <div className="flex items-center gap-1 bg-muted/65 p-1 rounded-xl border border-border/80">
          <button
            onClick={() => onNavigateMonth(-1)}
            className="w-7 h-7 hover:bg-card hover:text-foreground rounded-lg flex items-center justify-center transition cursor-pointer text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => {
              const today = new Date();
              onNavigateMonth(0); // reset to current month (handles reset inside App.tsx or month calculations)
              onSelectDate(formatLocalDate(today));
            }}
            className="px-2.5 py-1 hover:bg-card hover:text-foreground rounded-lg text-[10px] font-bold tracking-tight transition cursor-pointer text-muted-foreground uppercase"
          >
            오늘
          </button>
          <button
            onClick={() => onNavigateMonth(1)}
            className="w-7 h-7 hover:bg-card hover:text-foreground rounded-lg flex items-center justify-center transition cursor-pointer text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Days of the Week Header ── */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
        {daysOfWeek.map((day, idx) => {
          let color = 'text-muted-foreground';
          if (idx === 0) color = 'text-red-500/85'; // Sunday color
          if (idx === 6) color = 'text-sky-500/85'; // Saturday color
          return (
            <span key={day} className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${color}`}>
              {day}
            </span>
          );
        })}
      </div>

      {/* ── Calendar Grid ── */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarCells.map(({ dateStr, dayNum, isCurrentMonth }, idx) => {
          const isSelected = selectedDate === dateStr;
          const todayStr = formatLocalDate(new Date());
          const isToday = todayStr === dateStr;

          const dayEvents = events.filter((e) => e.date === dateStr);
          const hasEvents = dayEvents.length > 0;

          // Align cell day of week weekend styling
          const cellDayOfWeek = idx % 7;
          let numColor = isCurrentMonth ? 'text-foreground/90' : 'text-muted-foreground/35';
          if (isCurrentMonth) {
            if (cellDayOfWeek === 0) numColor = 'text-red-500/85 font-medium'; // Sunday weekend styling
            if (cellDayOfWeek === 6) numColor = 'text-sky-500/85 font-medium'; // Saturday weekend styling
          }

          const borderClass = isSelected
            ? 'bg-gradient-to-br from-accent to-accent-secondary border-transparent shadow-accent active:scale-95'
            : isToday
              ? 'border-accent bg-accent/5 hover:bg-accent/10'
              : 'border-transparent hover:bg-muted/50';

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square w-full rounded-2xl border flex flex-col items-center justify-center relative transition duration-150 cursor-pointer ${borderClass}`}
            >
              <span className={`text-[13px] leading-none
                ${isSelected ? 'text-white font-bold'
                  : isToday ? 'text-accent font-bold'
                  : numColor}`}>
                {dayNum}
              </span>

              {hasEvents && (
                <div className="absolute bottom-1 flex gap-0.5 justify-center">
                  {dayEvents.slice(0, 3).map((ev, eIdx) => (
                    <span
                      key={ev.id || eIdx}
                      className={`w-1.5 h-1.5 rounded-full
                        ${isSelected
                          ? 'bg-white' 
                          : isToday
                            ? 'bg-accent'
                            : isPastDate(dateStr)
                              ? 'bg-slate-300'
                              : getGatheringTypeDotClass(ev.gatheringType)}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend (Gathering Types Filter) ── */}
      {visibleTypes && visibleTypes.length > 1 && (
      <div
        ref={legendRef}
        className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5"
      >
        {Object.entries(GATHERING_TYPE_COLORS).filter(([type]) => visibleTypes.includes(type)).map(([type, colors]) => {
          const isActive = selectedGatheringType === type;
          const isAnyActive = selectedGatheringType !== null;
          return (
            <button
              key={type}
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) {
                  onSelectGatheringType(null);
                } else {
                  onSelectGatheringType(type);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-semibold transition-all duration-200 cursor-pointer
                ${isActive 
                  ? `${colors.bg} ${colors.border} ${colors.text} font-bold scale-105 shadow-sm` 
                  : 'text-muted-foreground border-border hover:bg-muted'
                }
                ${isAnyActive && !isActive ? 'opacity-40 scale-95' : 'opacity-100'}
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              <span>{type}</span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
