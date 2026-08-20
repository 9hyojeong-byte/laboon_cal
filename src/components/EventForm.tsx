import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Check, MapPin, User, Waves } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime, normalizeToHourLabel } from '../lib/timeUtils';

interface EventFormProps {
  selectedDate: string;
  editingEvent: ScheduleEvent | null;
  onSave: (event: Omit<ScheduleEvent, 'createdAt'>) => void;
  onCancel: () => void;
}

const LOCATIONS = ['딥스', '성남', '파라', '수원', '자유일정'] as const;
type LocationType = typeof LOCATIONS[number];
const SESSIONS = ['1부', '2부', '3부', '4부', '5부'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}시`);
const GATHERING_TYPES = ['트레이닝', '같이가요', '교육', '투어', '기타'] as const;

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

const getEarlyDescription = (sess: string) => {
  const times = getBuoyTimes(sess);
  return `빠른 입장 하겠습니다. ${times.early}에 입장 예정.`;
};

const getLateDescription = (sess: string) => {
  const times = getBuoyTimes(sess);
  return `늦은 입장 하겠습니다. ${times.late}에 입장 예정.`;
};

const isAutoDescription = (desc: string) => {
  const trimmed = desc.trim();
  if (!trimmed) return true;
  const sessions = ['1부', '2부', '3부', '4부', '5부'];
  for (const s of sessions) {
    if (trimmed === getEarlyDescription(s) || trimmed === getLateDescription(s)) {
      return true;
    }
  }
  if (trimmed === '30분 빠른입장' || trimmed === '30분 늦은입장') {
    return true;
  }
  return false;
};

function buildAutoTitle(
  authorName: string,
  loc: string,
  sess: string,
  hr: string,
  deepTank: string | null,
  allDay: boolean,
  specialEntry: boolean
): string {
  const parts: string[] = [];
  const trimmedAuthor = authorName.trim();
  if (trimmedAuthor) {
    parts.push(trimmedAuthor);
  }
  parts.push(loc);

  const timeStr = allDay ? '하루종일' : (loc === '딥스' || loc === '파라' ? sess : hr);
  parts.push(timeStr);

  if (!allDay && (loc === '딥스' || loc === '파라') && deepTank) {
    if (deepTank === '전반부이' || deepTank === '전반') {
      parts.push('전반');
      if (specialEntry) {
        parts.push('빠입');
      }
    } else if (deepTank === '후반부이' || deepTank === '후반') {
      parts.push('후반');
      if (specialEntry) {
        parts.push('늦입');
      }
    }
  }

  return parts.join('/');
}

const adjustTitleForSpecialEntry = (currentTitle: string, deepTank: string | null, special: boolean): string => {
  let parts = currentTitle.split('/');
  
  // Remove buoy tags from the end of the parts array
  while (parts.length > 0) {
    const lastPart = parts[parts.length - 1].trim();
    if (['전반', '후반', '빠입', '늦입'].includes(lastPart)) {
      parts.pop();
    } else {
      break;
    }
  }
  
  // Append new tags
  if (deepTank) {
    if (deepTank === '전반부이') {
      parts.push('전반');
      if (special) {
        parts.push('빠입');
      }
    } else if (deepTank === '후반부이') {
      parts.push('후반');
      if (special) {
        parts.push('늦입');
      }
    }
  }
  
  return parts.join('/');
};

export default function EventForm({ selectedDate, editingEvent, onSave, onCancel }: EventFormProps) {
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState<LocationType>('딥스');
  const [isAllDay, setIsAllDay] = useState(false);
  const [session, setSession] = useState('1부');
  const [hour, setHour] = useState('12시');
  const [deepTankUsage, setDeepTankUsage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  
  const [company, setCompany] = useState('');
  const [gatheringType, setGatheringType] = useState<string>('트레이닝');
  const [earlyLateEntry, setEarlyLateEntry] = useState(true);

  const buoyTimes = getBuoyTimes(session);

  useEffect(() => {
    const savedName = localStorage.getItem('lastAuthorName') || localStorage.getItem('lastAttendeeName') || '';

    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(editingEvent.date);
      setEndDate(editingEvent.endDate || editingEvent.date);
      setDescription(editingEvent.description || '');
      setDeepTankUsage(editingEvent.deepTankUsage || null);
      setCompany(editingEvent.company || '');
      setGatheringType(editingEvent.gatheringType || '트레이닝');

      const hasSpecial = editingEvent.title.includes('빠입') || 
                        editingEvent.title.includes('늦입') ||
                        (editingEvent.description || '').includes('빠른입장') ||
                        (editingEvent.description || '').includes('늦은입장');
      setEarlyLateEntry(hasSpecial);

      const attendeesList = editingEvent.attendees
        ? editingEvent.attendees.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (attendeesList.length > 0) {
        setAuthor(attendeesList[0]);
      } else {
        setAuthor(savedName);
      }

      let detLocation: LocationType = '딥스';
      if (editingEvent.location && LOCATIONS.includes(editingEvent.location as any)) {
        detLocation = editingEvent.location as LocationType;
      } else {
        const fullText = `${editingEvent.title} ${editingEvent.description || ''}`;
        if (fullText.includes('성남')) detLocation = '성남';
        else if (fullText.includes('파라')) detLocation = '파라';
        else if (fullText.includes('수원')) detLocation = '수원';
        else if (fullText.includes('자유일정')) detLocation = '자유일정';
      }
      setLocation(detLocation);

      const isDayAll = !editingEvent.startTime;
      setIsAllDay(isDayAll);
      if (!isDayAll && editingEvent.startTime) {
        const raw = editingEvent.startTime;
        if (detLocation === '딥스' || detLocation === '파라') {
          setSession(SESSIONS.includes(raw as any) ? raw : '1부');
        } else {
          setHour(normalizeToHourLabel(raw));
        }
      } else {
        setSession('1부');
        setHour('12시');
      }
    } else {
      setDate(selectedDate); setEndDate(selectedDate); setLocation('딥스');
      setIsAllDay(false); setSession('1부'); setHour('12시'); setDeepTankUsage(null); setDescription('');
      setCompany(''); setGatheringType('트레이닝');
      setAuthor(savedName);
      setEarlyLateEntry(true);

      const initialAuthor = savedName.trim() || '';
      const initialTitle = buildAutoTitle(initialAuthor, '딥스', '1부', '12시', null, false, true);
      setTitle(initialTitle);
    }
  }, [editingEvent, selectedDate]);

  const handleDeepTankClick = (option: string) => {
    let nextUsage: string | null = null;
    let nextSpecial = earlyLateEntry;

    if (deepTankUsage === option) {
      nextUsage = null;
    } else {
      nextUsage = option;
      nextSpecial = true;
      setEarlyLateEntry(true);
    }
    setDeepTankUsage(nextUsage);
    setTitle(prev => adjustTitleForSpecialEntry(prev, nextUsage, nextSpecial));
  };

  const handleToggleEntry = (val: boolean) => {
    setEarlyLateEntry(val);
    setTitle(prev => adjustTitleForSpecialEntry(prev, deepTankUsage, val));
  };

  useEffect(() => {
    const autoTitle = buildAutoTitle(author, location, session, hour, deepTankUsage, isAllDay, earlyLateEntry);
    setTitle(autoTitle);
  }, [author, location, session, hour, deepTankUsage, isAllDay, earlyLateEntry]);

  useEffect(() => {
    if (isAutoDescription(description)) {
      if (deepTankUsage === '전반부이') {
        if (earlyLateEntry) {
          setDescription(getEarlyDescription(session));
        } else {
          setDescription('');
        }
      } else if (deepTankUsage === '후반부이') {
        if (earlyLateEntry) {
          setDescription(getLateDescription(session));
        } else {
          setDescription('');
        }
      } else {
        setDescription('');
      }
    }
  }, [session, deepTankUsage, earlyLateEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) { alert('일정 제목과 날짜는 필수입니다.'); return; }
    if (endDate && endDate < date) {
      alert('종료 날짜는 시작 날짜보다 빠를 수 없습니다.');
      return;
    }

    const trimmedAuthor = author.trim();
    if (trimmedAuthor) {
      localStorage.setItem('lastAuthorName', trimmedAuthor);
      localStorage.setItem('lastAttendeeName', trimmedAuthor);
    }

    let combinedAttendees: string | null = null;
    if (editingEvent && editingEvent.attendees) {
      const existingList = editingEvent.attendees.split(',').map(s => s.trim()).filter(Boolean);
      const rest = existingList.slice(1).filter(s => s !== trimmedAuthor);
      combinedAttendees = trimmedAuthor ? [trimmedAuthor, ...rest].join(', ') : (rest.join(', ') || null);
    } else {
      combinedAttendees = trimmedAuthor || null;
    }

    let finalStartTime: string | null = null;
    if (!isAllDay) {
      if (location === '딥스' || location === '파라') {
        finalStartTime = session;
      } else {
        const hNum = parseInt(hour.replace('시', ''), 10);
        finalStartTime = `${String(hNum).padStart(2, '0')}:00`;
      }
    }

    onSave({
      ...editingEvent,
      id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      date,
      endDate: endDate && endDate !== date ? endDate : null,
      startTime: finalStartTime,
      endTime: editingEvent ? editingEvent.endTime : null,
      deepTankUsage: (location === '딥스' || location === '파라') ? (deepTankUsage || null) : null,
      description: description.trim() || null,
      location,
      attendees: combinedAttendees,
      company: editingEvent ? (editingEvent.company || 'laboon01') : 'laboon01',
      gatheringType: gatheringType || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-foreground/20 z-50 flex items-end sm:items-center justify-center backdrop-blur-md">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden border border-border shadow-2xl animate-pop-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4.5 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-accent" strokeWidth={2} />
            </div>
            <h3 className="font-display font-medium text-foreground text-lg tracking-tight">
              {editingEvent ? '일정 수정' : '새 일정 추가'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* 1. Author */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-accent" />작성자명 (첫 참석자로 자동 등록됩니다)
            </label>
            <input
              type="text"
              placeholder="예: 홍길동"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/45 transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:bg-card"
              autoFocus
            />
          </div>

          {/* 2. [NEW] Gathering Type Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              벙 타입 *
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {GATHERING_TYPES.map((type) => {
                const isActive = gatheringType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setGatheringType(type)}
                    className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-full border transition cursor-pointer duration-150
                      ${isActive
                        ? 'bg-accent border-accent text-white shadow-sm'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Location */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent" />장소 *
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {LOCATIONS.map((loc) => {
                const isActive = location === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setLocation(loc);
                      if (loc === '딥스' || loc === '파라') {
                        setSession('1부');
                      } else {
                        setHour('12시');
                        setDeepTankUsage(null);
                      }
                      if (loc !== '자유일정') {
                        setEndDate(date);
                      }
                    }}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition cursor-pointer duration-150
                      ${isActive
                        ? 'bg-accent border-accent text-white shadow-sm'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Date Selection */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                {location === '자유일정' ? '시작 날짜 *' : '날짜 *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (location !== '자유일정' || !endDate || endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm font-medium text-foreground transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:bg-card"
              />
            </div>

            {location === '자유일정' && (
              <div className="space-y-1.5 animate-pop-in">
                <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-accent" />종료 날짜 *
                </label>
                <input
                  type="date"
                  required
                  value={endDate || date}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                  className="w-full px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm font-medium text-foreground transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:bg-card"
                />
              </div>
            )}
          </div>





          {/* 4. Time Selection */}
          {!isAllDay && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                {location === '딥스' || location === '파라' ? (
                  <>
                    <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                      시간 (부 선택) *
                    </label>
                    <div className="flex gap-1.5">
                      {SESSIONS.map((sess) => {
                        const isActive = session === sess;
                        return (
                          <button
                            key={sess}
                            type="button"
                            onClick={() => setSession(sess)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer duration-155
                              ${isActive
                                ? 'bg-accent border-accent text-white shadow-sm'
                                : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
                          >
                            {sess}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                      시간 (정각 단위) *
                    </label>
                    <div className="relative">
                      <select
                        value={hour}
                        onChange={(e) => setHour(e.target.value)}
                        className="w-full px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:bg-card transition cursor-pointer appearance-none"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">
                        ▼
                      </div>
                    </div>
                  </>
                )}
              </div>

              {(location === '딥스' || location === '파라') && (
                <div className="space-y-2 bg-sky-50/20 p-3.5 rounded-2xl border border-sky-100/50 animate-pop-in">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-semibold text-sky-900/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-sky-500" strokeWidth={2} />
                      딥탱크 이용시간
                    </label>
                    {deepTankUsage && (
                      <button
                        type="button"
                        onClick={() => handleDeepTankClick(deepTankUsage)}
                        className="text-[10px] font-semibold text-sky-700 hover:underline cursor-pointer"
                      >
                        선택 해제
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {['전반부이', '후반부이'].map((option) => {
                      const isActive = deepTankUsage === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleDeepTankClick(option)}
                          className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition cursor-pointer duration-150 flex items-center justify-center gap-1
                            ${isActive
                              ? 'bg-sky-500 border-sky-500 text-white shadow-sm font-bold'
                              : 'bg-card border-sky-200/50 text-sky-700/80 hover:bg-sky-50/50'}`}
                        >
                          <span>{option}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                  {deepTankUsage && (
                    <div className="mt-3 pt-3 border-t border-sky-100/50 flex items-center justify-between animate-pop-in">
                      <span className="text-[11px] font-semibold text-sky-900/80">
                        {deepTankUsage === '전반부이' ? `30분 빠른입장 (${buoyTimes.early})` : `30분 늦은입장 (${buoyTimes.late})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleEntry(!earlyLateEntry)}
                        className={`w-10 h-5.5 rounded-full relative flex items-center transition-colors cursor-pointer border border-sky-200/50
                          ${earlyLateEntry ? 'bg-sky-500 border-sky-500' : 'bg-slate-200'}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full bg-card shadow-sm transition-transform absolute
                          ${earlyLateEntry ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* All Day Toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-card rounded-xl border border-border">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
              하루 종일 진행
            </span>
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`w-11 h-6 rounded-full relative flex items-center transition-colors cursor-pointer border border-border/80 bg-muted
                ${isAllDay ? 'bg-accent border-accent' : 'bg-slate-200'}`}
            >
              <span className={`w-4 h-4 rounded-full bg-card shadow-sm transition-transform absolute
                ${isAllDay ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
            </button>
          </div>



          {/* 6. Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-accent" />메모
            </label>
            <textarea
              placeholder="추가 메모를 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/45 transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:bg-card resize-none"
            />
          </div>

          {/* 7. Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-muted text-foreground font-semibold text-xs rounded-xl hover:bg-slate-200 transition-all duration-150 cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-accent to-accent-secondary text-white font-semibold text-xs rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-accent active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" strokeWidth={2} />
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
