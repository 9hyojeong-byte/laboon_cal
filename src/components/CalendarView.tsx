import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { isPastDate } from '../lib/timeUtils';
import { GATHERING_TYPE_COLORS, getGatheringTypeDotClass } from '../lib/gatheringTypeColors';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: string;
  events: ScheduleEvent[];
  onSelectDate: (dateStr: string) => void;
  onNavigateMonth: (offset: number) => void;
  onGoToToday: () => void;
  selectedGatheringType: string | null;
  onSelectGatheringType: (type: string | null) => void;
  visibleTypes?: string[];
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const isMultiDay = (e: ScheduleEvent): e is ScheduleEvent & { endDate: string } =>
  !!e.endDate && e.endDate !== e.date;

const MAX_VISIBLE_LANES = 2;

interface CalendarCell {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
}

interface BarSegment {
  event: ScheduleEvent;
  startCol: number;
  endCol: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

// Greedily packs multi-day events into the fewest lanes such that no two
// events sharing a lane overlap in date range. The same event always keeps
// the same lane across every week row it appears in.
function assignLanes(multiDayEvents: ScheduleEvent[]): Map<string, number> {
  const sorted = [...multiDayEvents].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.endDate as string) < (b.endDate as string) ? 1 : -1;
  });
  const laneEndDates: string[] = [];
  const laneMap = new Map<string, number>();

  for (const ev of sorted) {
    let lane = laneEndDates.findIndex((endDate) => endDate < ev.date);
    if (lane === -1) {
      lane = laneEndDates.length;
      laneEndDates.push(ev.endDate as string);
    } else {
      laneEndDates[lane] = ev.endDate as string;
    }
    laneMap.set(ev.id, lane);
  }
  return laneMap;
}

function computeWeekBars(week: CalendarCell[], multiDayEvents: ScheduleEvent[], laneMap: Map<string, number>) {
  const weekStart = week[0].dateStr;
  const weekEnd = week[6].dateStr;
  const lanes: BarSegment[][] = Array.from({ length: MAX_VISIBLE_LANES }, () => []);
  const overflow = new Array(7).fill(0);

  for (const ev of multiDayEvents) {
    const evEnd = ev.endDate as string;
    if (ev.date > weekEnd || evEnd < weekStart) continue;

    const startIdx = week.findIndex((c) => c.dateStr === ev.date);
    const endIdx = week.findIndex((c) => c.dateStr === evEnd);
    const segment: BarSegment = {
      event: ev,
      startCol: startIdx === -1 ? 0 : startIdx,
      endCol: endIdx === -1 ? 6 : endIdx,
      continuesLeft: ev.date < weekStart,
      continuesRight: evEnd > weekEnd,
    };

    const lane = laneMap.get(ev.id) ?? MAX_VISIBLE_LANES;
    if (lane < MAX_VISIBLE_LANES) {
      lanes[lane].push(segment);
    } else {
      for (let c = segment.startCol; c <= segment.endCol; c++) overflow[c]++;
    }
  }

  return { lanes, overflow };
}

export default function CalendarView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onNavigateMonth,
  onGoToToday,
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

  const calendarCells: CalendarCell[] = [];

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

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7));
  }

  const visibleStart = weeks[0][0].dateStr;
  const visibleEnd = weeks[weeks.length - 1][6].dateStr;
  const relevantMultiDayEvents = events.filter(
    (e) => isMultiDay(e) && e.date <= visibleEnd && (e.endDate as string) >= visibleStart
  );
  const laneMap = assignLanes(relevantMultiDayEvents);

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const todayStr = formatLocalDate(new Date());

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
              onGoToToday();
              onSelectDate(todayStr);
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

      {/* ── Calendar Grid (rendered week-by-week so multi-day bars can span columns) ── */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => {
          const { lanes, overflow } = computeWeekBars(week, relevantMultiDayEvents, laneMap);
          const hasOverflow = overflow.some((n) => n > 0);

          return (
            <div className="relative" key={weekIdx}>
              <div className="grid grid-cols-7 gap-1 text-center">
                {week.map(({ dateStr, dayNum, isCurrentMonth }, idx) => {
                  const isSelected = selectedDate === dateStr;
                  const isToday = todayStr === dateStr;

                  const dayEvents = events.filter((e) => e.date === dateStr && !isMultiDay(e));
                  const hasEvents = dayEvents.length > 0;

                  let numColor = isCurrentMonth ? 'text-foreground/90' : 'text-muted-foreground/35';
                  if (isCurrentMonth) {
                    if (idx === 0) numColor = 'text-red-500/85 font-medium'; // Sunday weekend styling
                    if (idx === 6) numColor = 'text-sky-500/85 font-medium'; // Saturday weekend styling
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
                      className={`h-14 w-full rounded-2xl border flex flex-col items-center pt-1.5 gap-1 relative transition duration-150 cursor-pointer ${borderClass}`}
                    >
                      <span className={`text-[13px] leading-none
                        ${isSelected ? 'text-white font-bold'
                          : isToday ? 'text-accent font-bold'
                          : numColor}`}>
                        {dayNum}
                      </span>

                      {hasEvents && (
                        <div className="flex gap-0.5 justify-center">
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

              {/* ── Multi-day event bars (overlay, spans across day columns) ── */}
              <div className="absolute inset-x-0 bottom-1 flex flex-col gap-[2px] pointer-events-none">
                {lanes.map((segments, laneIdx) => (
                  <div key={laneIdx} className="grid grid-cols-7 gap-1 h-[6px]">
                    {segments.map((seg) => (
                      <div
                        key={seg.event.id}
                        onClick={() => onSelectDate(seg.event.date)}
                        title={seg.event.title}
                        style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}` }}
                        className={`h-full pointer-events-auto cursor-pointer ${getGatheringTypeDotClass(seg.event.gatheringType)}
                          ${seg.continuesLeft ? '' : 'rounded-l-full'}
                          ${seg.continuesRight ? '' : 'rounded-r-full'}`}
                      />
                    ))}
                  </div>
                ))}

                {hasOverflow && (
                  <div className="grid grid-cols-7 gap-1">
                    {overflow.map((count, i) =>
                      count > 0 ? (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSelectDate(week[i].dateStr)}
                          className="pointer-events-auto cursor-pointer text-[8px] leading-none font-bold text-muted-foreground hover:text-accent"
                        >
                          +{count}
                        </button>
                      ) : (
                        <div key={i} />
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
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
