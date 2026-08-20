import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, Users, UserPlus, Sparkles, Link, Waves, Edit2, Trash2 } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime } from '../lib/timeUtils';

interface EventDetailModalProps {
  event: ScheduleEvent;
  onClose: () => void;
  onAddAttendee: (scheduleId: string, nickname: string) => Promise<void>;
  onRemoveAttendee: (scheduleId: string, nickname: string) => Promise<void>;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
}

export default function EventDetailModal({
  event,
  onClose,
  onAddAttendee,
  onRemoveAttendee,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  const [newName, setNewName] = useState('');
  const [savedMyName, setSavedMyName] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleCopyLink = async () => {
    const formattedDate = event.endDate
      ? `${formatKoreanDate(event.date)} ~ ${formatKoreanDate(event.endDate)}`
      : formatKoreanDate(event.date);
    const timeText = event.startTime
      ? `${formatTime(event.startTime)}${event.endTime ? ` ~ ${formatTime(event.endTime)}` : ''}`
      : '하루종일';
    const deepTankText = event.deepTankUsage ? `, 딥탱크: ${event.deepTankUsage}` : '';
    const locationText = event.location || '일반';
    const url = `${window.location.origin}${window.location.pathname}?scheduleId=${event.id}`;
    
    const attendeesList = event.attendees
      ? event.attendees.split(',').map(n => n.trim()).filter(n => n.length > 0)
      : [];
    const attendeesText = attendeesList.length > 0
      ? `${attendeesList.join(', ')} (${attendeesList.length}명)`
      : '없음';

    const companyText = event.company ? `\n• 업체: ${event.company}` : '';
    const typeText = event.gatheringType ? ` [${event.gatheringType}]` : '';

    const textToCopy = `📅 [라분다이브 일정]${typeText}
• 일시: ${formattedDate} (${timeText}${deepTankText})${companyText}
• 장소: ${locationText}
• 메모: ${event.description || '-'}
• 참석자: ${attendeesText}
🔗 링크: ${url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('링크 복사에 실패했습니다.');
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('lastAttendeeName') || '';
    setSavedMyName(cached);
    if (cached) setNewName(cached);
  }, []);

  const getAttendeesList = (): string[] => {
    if (!event.attendees) return [];
    return event.attendees.split(',').map(n => n.trim()).filter(n => n.length > 0);
  };
  const attendees = getAttendeesList();

  const handleAddAttendee = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (attendees.includes(trimmed)) { alert('이미 등록된 참석자입니다.'); return; }
    localStorage.setItem('lastAttendeeName', trimmed);
    setSavedMyName(trimmed);
    await onAddAttendee(event.id, trimmed);
    setNewName('');
  };

  const handleRemoveAttendee = async (name: string) => {
    if (!window.confirm(`"${name}" 님을 참석자에서 제외하시겠습니까?`)) return;
    await onRemoveAttendee(event.id, name);
  };

  const formatKoreanDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = dayNames[date.getDay()];
      return `${month + 1}월 ${day}일 (${dayOfWeek})`;
    } catch { return dateStr; }
  };

  const handleEditClick = () => {
    onEdit(event);
    onClose();
  };

  const handleDeleteClick = () => {
    if (window.confirm(`"${event.title}" 일정을 정말로 삭제하시겠습니까?`)) {
      onDelete(event.id);
      onClose();
    }
  };

  const locationColors: Record<string, string> = {
    '딥스':   'bg-blue-50 border-blue-100 text-blue-650 font-bold',
    '파라':   'bg-red-50 border-red-100 text-red-650 font-bold',
    '성남':   'bg-emerald-50 border-emerald-100 text-emerald-650 font-bold',
    '수원':   'bg-orange-50 border-orange-100 text-orange-650 font-bold',
    '자유일정':'bg-violet-50 border-violet-100 text-violet-650 font-bold',
  };
  const locColor = locationColors[event.location || ''] || 'bg-slate-50 border-slate-100 text-slate-500';

  return (
    <div className="fixed inset-0 bg-foreground/20 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden border border-border shadow-2xl flex flex-col max-h-[92vh] animate-pop-in relative">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4.5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${locColor}`}>
              {event.location || '일반'}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">일정 상세</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDeleteClick}
              type="button"
              className="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition cursor-pointer text-muted-foreground border border-border/30"
              title="일정 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={handleEditClick}
              type="button"
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition cursor-pointer text-muted-foreground hover:text-foreground border border-border/30"
              title="일정 수정"
            >
              <Edit2 className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={handleCopyLink}
              type="button"
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition cursor-pointer text-muted-foreground hover:text-foreground border border-border/30"
              title="링크 복사"
            >
              <Link className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition cursor-pointer text-muted-foreground hover:text-foreground border border-border/30"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Title Card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
            <h2 className="font-display text-xl font-medium text-foreground leading-snug break-all">
              {event.title}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5 bg-muted/65 px-3 py-1 rounded-full border border-border/80 text-[11px] font-medium text-muted-foreground font-mono">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
                <span>{formatKoreanDate(event.date)}{event.endDate ? ` ~ ${formatKoreanDate(event.endDate)}` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/65 px-3 py-1 rounded-full border border-border/80 text-[11px] font-medium text-muted-foreground font-mono">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
                <span>
                  {event.startTime
                    ? `${formatTime(event.startTime)}${event.endTime ? ` ~ ${formatTime(event.endTime)}` : ''}`
                    : '하루종일'}
                </span>
              </div>
              {event.deepTankUsage && (
                <div className="flex items-center gap-1.5 bg-sky-50 px-3 py-1 rounded-full border border-sky-100 text-[11px] font-semibold text-sky-700">
                  <Waves className="w-3.5 h-3.5 text-sky-500" strokeWidth={1.5} />
                  <span>딥탱크 {event.deepTankUsage}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5 bg-violet-50 px-3 py-1 rounded-full border border-violet-100 text-[11px] font-semibold text-violet-700">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} />
                  <span>{event.location}</span>
                </div>
              )}
              {event.gatheringType && (
                <div className="flex items-center gap-1.5 bg-accent/5 px-3 py-1 rounded-full border border-accent/20 text-[11px] font-semibold text-accent select-none">
                  <span>{event.gatheringType}</span>
                </div>
              )}

            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-accent" />메모
              </label>
              <div className="bg-muted/15 p-4 rounded-xl border border-border text-sm font-medium text-muted-foreground leading-relaxed break-all whitespace-pre-line">
                {event.description}
              </div>
            </div>
          )}

          {/* Attendees */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent" />참석자 현황
              </label>
              <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-mono font-bold rounded-full border border-accent/20">
                {attendees.length}명
              </span>
            </div>

            {attendees.length === 0 ? (
              <div className="text-center py-6 bg-card rounded-xl border border-dashed border-border">
                <p className="text-xs font-semibold text-muted-foreground">아직 등록된 참석자가 없어요.</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">가장 먼저 참석 등록을 해보세요!</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 bg-muted/10 p-3 rounded-xl border border-border min-h-12">
                {attendees.map((name, index) => {
                  const isLeader = index === 0;
                  const badgeClasses = isLeader
                    ? 'bg-amber-400 border-amber-500 text-slate-950 font-extrabold hover:bg-red-500 hover:border-red-600 hover:text-white'
                    : 'bg-slate-900 border-transparent text-white font-medium hover:bg-red-500 hover:text-white';
                  return (
                    <button
                      key={name}
                      onClick={() => handleRemoveAttendee(name)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs transition duration-150 cursor-pointer ${badgeClasses}`}
                      title={isLeader ? '작성자 (클릭 시 참석 취소)' : '참석 취소'}
                    >
                      <span>{isLeader ? `👑 ${name}` : name}</span>
                      <X className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Attendee */}
          <div className="space-y-2.5 bg-card p-4 rounded-xl border border-border shadow-sm">
            <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-accent" />참석자 등록
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={10}
                placeholder="이름 입력 (예: 길동)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttendee(newName); }}}
                className="flex-1 px-3.5 py-2 border border-border bg-muted/20 rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground/45 transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:bg-card"
              />
              <button
                type="button"
                onClick={() => handleAddAttendee(newName)}
                className="px-4 py-2 bg-gradient-to-r from-accent to-accent-secondary text-white font-semibold text-xs rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-accent active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                등록
              </button>
            </div>

            {savedMyName && !attendees.includes(savedMyName) && (
              <button
                type="button"
                onClick={() => handleAddAttendee(savedMyName)}
                className="text-[10px] font-semibold text-accent hover:underline flex items-center gap-1 transition cursor-pointer mt-1"
              >
                <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                <span>'{savedMyName}'으로 바로 참석</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-card shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-secondary text-white font-semibold text-xs rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-accent active:scale-[0.98] transition-all duration-150 cursor-pointer text-center"
          >
            확인 및 닫기
          </button>
        </div>

        {/* Copy Link Toast Notification */}
        {showToast && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-xl border border-border shadow-lg z-[60] animate-pop-in flex items-center gap-1.5 whitespace-nowrap">
            <span>일정 링크가 복사되었습니다! 🔗</span>
          </div>
        )}
      </div>
    </div>
  );
}
