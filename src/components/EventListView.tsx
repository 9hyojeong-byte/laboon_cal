import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Settings, X, CalendarDays, Link } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime, isPastDate } from '../lib/timeUtils';
import { getSessionTimeRange, formatLocationName } from '../lib/locationSessions';
import { getAuthorNameFromTitle } from '../lib/eventAuthor';
import { linkifyText } from '../lib/linkifyText';

interface EventListViewProps {
  selectedDate: string;
  currentMonth: Date;
  events: ScheduleEvent[];
  onAddEventClick: () => void;
  onEventClick: (event: ScheduleEvent) => void;
  onSelectDate: (dateStr: string) => void;
  searchQuery?: string;
  isAdminMode?: boolean;
}

const stickerColors = [
  { badgeBg: 'bg-violet-50', badgeText: 'text-violet-600', badgeBorder: 'border-violet-100/60' },
  { badgeBg: 'bg-pink-50', badgeText: 'text-pink-600', badgeBorder: 'border-pink-100/60' },
  { badgeBg: 'bg-amber-50', badgeText: 'text-amber-600', badgeBorder: 'border-amber-100/60' },
  { badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600', badgeBorder: 'border-emerald-100/60' },
  { badgeBg: 'bg-sky-50', badgeText: 'text-sky-600', badgeBorder: 'border-sky-100/60' },
];

const formatKoreanDate = (dateStr: string, includeDayOfWeek: boolean = false) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[date.getDay()];

    const formatted = `${month + 1}월 ${day}일`;
    return includeDayOfWeek ? `${formatted} (${dayOfWeek})` : formatted;
  } catch { return dateStr; }
};

const formatBadgeDate = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const date = new Date(parseInt(parts[0], 10), month - 1, day);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[date.getDay()];
    return `${month}/${day} (${dayOfWeek})`;
  } catch {
    return dateStr;
  }
};

const isNewSchedule = (createdAt: string): boolean => {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return false;
  const diffTime = Date.now() - createdTime;
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  return diffTime <= threeDaysInMs;
};

const getBuoyTimes = (sess: string) => {
  const mapping: Record<string, { early: string; late: string }> = {
    '1부': { early: '7:30', late: '8:30' },
    '2부': { early: '10:30', late: '11:30' },
    '3부': { early: '13:30', late: '14:30' },
    '4부': { early: '16:30', late: '17:30' },
    '5부': { early: '19:30', late: '20:30' },
  };
  return mapping[sess] || { early: '7:30', late: '8:30' };
};

const formatScreenshotStyleDate = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { dateText: dateStr, dayText: '' };
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day);
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayOfWeek = dayNames[date.getDay()];
    return {
      dateText: `${month}월 ${day}일`,
      dayText: dayOfWeek
    };
  } catch {
    return { dateText: dateStr, dayText: '' };
  }
};

const getBuoyDetailText = (sess: string, buoy: string) => {
  const sessionStarts: Record<string, string> = {
    '1부': '8:00',
    '2부': '11:00',
    '3부': '14:00',
    '4부': '17:00',
    '5부': '20:00',
  };
  const start = sessionStarts[sess];
  if (!start) return '';
  const [hStr] = start.split(':');
  const h = parseInt(hStr, 10);
  
  if (buoy === '전반부이') {
    return `부이 전반 사용 (${h}:00~${h+1}:30)`;
  } else if (buoy === '후반부이') {
    const nextH = h + 1;
    const endH = h + 3;
    return `부이 후반 사용 (${nextH}:30~${endH}:00)`;
  }
  return '';
};

function EventCard({
  ev,
  colorIdx,
  onEventClick,
  onCopySuccess,
}: {
  ev: ScheduleEvent;
  colorIdx: number;
  onEventClick: (e: ScheduleEvent) => void;
  onCopySuccess: () => void;
  showDate?: boolean;
}) {
  const isPast = isPastDate(ev.date);
  const color = stickerColors[colorIdx % stickerColors.length];

  // Past event styling overrides
  const cardBorder = isPast ? 'border-slate-100' : 'border-slate-100';
  const cardBg = isPast ? 'bg-[#F8FAFC]/65 opacity-70' : 'bg-card';
  const hoverClasses = isPast ? '' : 'hover:shadow-md hover:border-slate-200/50';

  const locationColors: Record<string, string> = {
    '딥스':   'bg-blue-50 border-blue-100 text-blue-650 font-bold',
    '파라':   'bg-red-50 border-red-100 text-red-650 font-bold',
    '밀양':   'bg-teal-50 border-teal-100 text-teal-650 font-bold',
    '북항':   'bg-cyan-50 border-cyan-100 text-cyan-650 font-bold',
    '패나':   'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-650 font-bold',
    '풀6':    'bg-lime-50 border-lime-100 text-lime-650 font-bold',
    '두류':   'bg-amber-50 border-amber-100 text-amber-650 font-bold',
    '문수':   'bg-rose-50 border-rose-100 text-rose-650 font-bold',
    '알프스': 'bg-indigo-50 border-indigo-100 text-indigo-650 font-bold',
  };
  // A location not in the preset list is a custom (직접입력) location -- make
  // it stand out instead of falling back to the muted "unknown" gray.
  const locColor = !ev.location
    ? 'bg-slate-50 border-slate-100 text-slate-500'
    : locationColors[ev.location] || 'bg-[#1A4D6C] border-[#1A4D6C] text-white font-extrabold shadow-sm';

  const typeColors: Record<string, string> = {
    '트레이닝': 'bg-sky-50 border-sky-100 text-sky-700 font-bold',
    '펀다이빙': 'bg-emerald-50 border-emerald-100 text-emerald-700 font-bold',
    '투어': 'bg-violet-50 border-violet-100 text-violet-700 font-bold',
    '교육': 'bg-amber-50 border-amber-100 text-amber-700 font-bold',
    '같이가요': 'bg-rose-50 border-rose-100 text-rose-700 font-bold',
    '기타': 'bg-slate-50 border-slate-200 text-slate-600 font-bold',
  };
  const typeColor = typeColors[ev.gatheringType || ''] || 'bg-slate-50 border-slate-100 text-slate-500';

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedDate = ev.endDate
      ? `${formatKoreanDate(ev.date, true)} ~ ${formatKoreanDate(ev.endDate, true)}`
      : formatKoreanDate(ev.date, true);
    const timeText = ev.startTime
      ? `${formatTime(ev.startTime)}${ev.endTime ? ` ~ ${formatTime(ev.endTime)}` : ''}`
      : '하루종일';
    const deepTankText = ev.deepTankUsage ? `, 딥탱크: ${ev.deepTankUsage}` : '';
    const locationText = ev.location || '일반';
    const url = `${window.location.origin}${window.location.pathname}?scheduleId=${ev.id}`;

    const attendeesList = ev.attendees
      ? ev.attendees.split(',').map(n => n.trim()).filter(n => n.length > 0)
      : [];
    const attendeesText = attendeesList.length > 0
      ? `${attendeesList.join(', ')} (${attendeesList.length}명)`
      : '없음';

    const typeText = ev.gatheringType ? ` [${ev.gatheringType}]` : '';

    const textToCopy = `📅 [라분다이브 일정]${typeText}
• 일시: ${formattedDate} (${timeText}${deepTankText})
• 장소: ${locationText}
• 메모: ${ev.description || '-'}
• 참석자: ${attendeesText}
🔗 링크: ${url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      onCopySuccess();
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('링크 복사에 실패했습니다.');
    }
  };

  const dateInfo = formatScreenshotStyleDate(ev.date);
  const buoyDetail = ev.deepTankUsage ? getBuoyDetailText(ev.startTime || '1부', ev.deepTankUsage) : '';
  const buoyTimes = getBuoyTimes(ev.startTime || '1부');
  const isEarly = ev.title.includes('빠입') || (ev.description || '').includes('빠른입장');
  const isLate = ev.title.includes('늦입') || (ev.description || '').includes('늦은입장');
  
  const entryText = ev.deepTankUsage === '전반부이'
    ? (isEarly ? `${buoyTimes.early} 빠른입장` : '정시 입장')
    : ev.deepTankUsage === '후반부이'
      ? (isLate ? `${buoyTimes.late} 늦은입장` : '정시 입장')
      : '';

  const timeRange = ev.startTime ? getSessionTimeRange(ev.location, ev.startTime) : '';
  const sessionText = ev.startTime 
    ? (timeRange ? `${ev.startTime} · ${timeRange}` : ev.startTime)
    : '하루종일';

  const typeBarColors: Record<string, string> = {
    '트레이닝': 'bg-[#3B82F6]', 
    '같이가요': 'bg-[#F43F5E]', 
    '교육': 'bg-[#F59E0B]', 
    '투어': 'bg-[#8B5CF6]', 
    '기타': 'bg-[#64748B]', 
  };
  const sideColorClass = typeBarColors[ev.gatheringType || ''] || 'bg-slate-300';

  const attendeeNames = ev.attendees ? ev.attendees.split(',').map(n => n.trim()).filter(Boolean) : [];
  const attendeesCount = attendeeNames.length;

  // Pin the true author (from the title, not array position) first, since
  // attendee fetch order isn't guaranteed stable.
  const titleAuthorName = getAuthorNameFromTitle(ev.title, ev.location);
  const hasResolvedAuthor = !!titleAuthorName && attendeeNames.includes(titleAuthorName);
  const authorName = hasResolvedAuthor ? titleAuthorName : (attendeeNames[0] || null);
  const orderedAttendeeNames = hasResolvedAuthor
    ? [titleAuthorName as string, ...attendeeNames.filter((n) => n !== titleAuthorName)]
    : attendeeNames;

  return (
    <div
      onClick={() => onEventClick(ev)}
      className={`${cardBg} rounded-3xl border ${cardBorder} ${hoverClasses} p-5 transition-all duration-200 flex flex-col space-y-4 relative overflow-hidden pl-7 shadow-sm cursor-pointer`}
    >
      {/* Side Color stripe */}
      <div className={`absolute left-0 top-0 h-full w-[5px] ${sideColorClass}`} />

      {/* 1. Top row: Date, New, Share */}
      <div className="flex items-center justify-between shrink-0 select-none">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-sans font-bold text-[17px] text-foreground leading-none">
            {dateInfo.dateText}
          </span>
          <span className="text-xs font-semibold text-muted-foreground leading-none">
            {dateInfo.dayText}
          </span>
          {ev.endDate && ev.endDate !== ev.date && (() => {
            const endDateInfo = formatScreenshotStyleDate(ev.endDate);
            return (
              <>
                <span className="text-xs font-semibold text-muted-foreground/60 leading-none">~</span>
                <span className="font-sans font-bold text-[17px] text-foreground leading-none">
                  {endDateInfo.dateText}
                </span>
                <span className="text-xs font-semibold text-muted-foreground leading-none">
                  {endDateInfo.dayText}
                </span>
              </>
            );
          })()}
        </div>

        <div className="flex items-center gap-1.5">
          {!isPast && isNewSchedule(ev.createdAt) && (
            <span className="px-2 py-0.5 bg-[#FFF1F2] text-[#F43F5E] text-[9px] font-bold tracking-wider rounded-md">
              NEW
            </span>
          )}
          <button
            onClick={handleCopyLink}
            type="button"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center transition cursor-pointer border border-transparent"
            title="일정 링크 복사"
          >
            <Link className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 2. Location & Gathering Type Row */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold select-none shrink-0">
        {ev.gatheringType && (
          <span className={`px-3 py-1 rounded-full border-2 text-[12px] font-extrabold ${typeColor}`}>
            {ev.gatheringType}
          </span>
        )}
        <span className={`px-3 py-1 rounded-full border-2 text-[12px] font-extrabold ${locColor}`}>
          {formatLocationName(ev.location)}
        </span>
      </div>

      {/* 3. Time Box Bar */}
      <div className="bg-[#EFF6FF] py-2.5 px-4 rounded-2xl flex items-center justify-between gap-3 select-none text-[11px] font-semibold text-[#1E40AF]">
        <div className="flex items-center gap-2">
          <span>🕒</span>
          <span className="font-bold">{sessionText}</span>
        </div>
        {entryText && (
          <span className="text-[#4B5563] text-[10px] font-medium">
            {entryText}
          </span>
        )}
      </div>

      {/* 4. Deep Tank Buoy details */}
      {ev.deepTankUsage && buoyDetail && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold select-none leading-none pt-0.5">
          <span>📍</span>
          <span>딥탱크 {buoyDetail}</span>
        </div>
      )}

      {ev.description && (
        <div className="text-xs md:text-[13px] text-foreground/80 font-medium leading-relaxed break-all whitespace-pre-line flex-1 flex items-start gap-2">
          <span className="shrink-0 select-none">💬</span>
          <span>{linkifyText(ev.description)}</span>
        </div>
      )}

      {/* 6. Divider & Bottom Row */}
      {ev.attendees && (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4 select-none shrink-0">
          {/* Attendees List */}
          <div className="flex flex-wrap gap-1.5 flex-1">
            {orderedAttendeeNames.map((name) => {
              const isLeader = name === authorName;
              const attendeeBadgeClass = isLeader
                ? 'bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#92400E] font-bold shadow-sm'
                : 'bg-slate-100 border border-transparent text-slate-700 font-medium';
              return (
                <span
                  key={name}
                  className={`${attendeeBadgeClass} px-3 py-0.5 rounded-full text-[10px]`}
                >
                  {isLeader ? `🔥 ${name}` : name}
                </span>
              );
            })}
          </div>

          {/* Attendees Count */}
          <span className="text-[11px] font-semibold text-muted-foreground/80 shrink-0">
            {attendeesCount}명 참여
          </span>
        </div>
      )}
    </div>
  );
}

export default function EventListView({
  selectedDate,
  events,
  onAddEventClick,
  onEventClick,
  onSelectDate,
  searchQuery,
  isAdminMode = false,
}: EventListViewProps) {
  const [showCopyToast, setShowCopyToast] = useState(false);
  const handleCopySuccess = () => {
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  // 1. 데이터 준비 (필터링 및 정렬)
  let displayEvents: ScheduleEvent[] = [];
  let isFiltered = false;

  if (selectedDate) {
    isFiltered = true;
    displayEvents = events
      .filter(e => {
        if (e.endDate) {
          return selectedDate >= e.date && selectedDate <= e.endDate;
        }
        return e.date === selectedDate;
      })
      .sort((a, b) => {
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
  } else {
    isFiltered = false;
    if (searchQuery && searchQuery.trim()) {
      // 검색 시에는 과거 일정도 포함하여 출력
      const todayOrFutureEvents = events.filter(e => !isPastDate(e.endDate || e.date));
      const pastEvents = events.filter(e => isPastDate(e.endDate || e.date));

      // 오늘~미래 일정은 날짜 이른 순(오름차순) 정렬
      todayOrFutureEvents.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });

      // 과거 일정은 최근 날짜 순(내림차순) 정렬
      pastEvents.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });

      displayEvents = [...todayOrFutureEvents, ...pastEvents];
    } else {
      // 일반 전체 보기 시에는 과거 일정을 제외하고 날짜 이른 순(오름차순) 정렬
      displayEvents = events
        .filter(e => !isPastDate(e.endDate || e.date))
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          if (!a.startTime) return -1;
          if (!b.startTime) return 1;
          return a.startTime.localeCompare(b.startTime);
        });
    }
  }

  return (
    <div className="space-y-3">
      {/* ── 헤더 영역 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-medium text-foreground tracking-tight">
            {isFiltered ? `${formatKoreanDate(selectedDate, true)} 일정` : '전체 일정'}
          </h3>
          <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-mono font-semibold rounded-full border border-accent/20">
            {displayEvents.length}
          </span>
          {isFiltered && (
            <button
              onClick={() => onSelectDate('')}
              className="px-2.5 py-0.5 bg-card text-muted-foreground text-[10px] font-semibold rounded-lg border border-border hover:bg-muted transition-all duration-150 cursor-pointer ml-1.5"
            >
              전체보기
            </button>
          )}
        </div>
        {isAdminMode && (
          <button
            onClick={onAddEventClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-accent to-accent-secondary text-white text-xs font-semibold rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-accent active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>추가</span>
          </button>
        )}
      </div>

      {/* ── 리스트 영역 ── */}
      {displayEvents.length === 0 ? (
        <EmptyState isSearch={!!searchQuery} />
      ) : (
        <div className="space-y-3">
          {displayEvents.map((ev, idx) => (
            <EventCard
              key={ev.id}
              ev={ev}
              colorIdx={idx}
              onEventClick={onEventClick}
              onCopySuccess={handleCopySuccess}
            />
          ))}
        </div>
      )}

      {/* Copy Link Toast Notification -- rendered once here (not per-card) and
          fixed to the viewport so it can never affect any card's layout. */}
      {showCopyToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-xl border border-border shadow-lg z-[60] animate-pop-in flex items-center gap-1.5 whitespace-nowrap">
          <span>일정 링크가 복사되었습니다! 🔗</span>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isSearch }: { isSearch?: boolean }) {
  return (
    <div className="text-center py-10 bg-card rounded-2xl border border-border shadow-sm flex flex-col items-center gap-3">
      <div className="relative w-14 h-14 flex items-center justify-center rounded-2xl bg-accent/5 border border-accent/10 text-accent">
        <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {isSearch ? '검색 결과가 없어요' : '등록된 일정이 없어요'}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-medium max-w-[240px] leading-relaxed">
          {isSearch ? '다른 이름으로 검색해보세요!' : '새로운 다이빙 벙을 직접 개설해보세요!'}
        </p>
      </div>
    </div>
  );
}
