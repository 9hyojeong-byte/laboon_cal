import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, CheckCircle2, ShieldAlert, X, Zap, Download, Search, Key } from 'lucide-react';
import { ScheduleEvent } from './types';
import CalendarView from './components/CalendarView';
import EventListView from './components/EventListView';
import EventForm from './components/EventForm';
import EventDetailModal from './components/EventDetailModal';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  addAttendee,
  removeAttendee
} from './lib/supabaseApi';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedGatheringType, setSelectedGatheringType] = useState<string | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ScheduleEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentSyncEmoji, setCurrentSyncEmoji] = useState('🌊');


  const installPromptRef = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!checkStandalone);
  }, []);

  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleToggleAdminMode = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      alert("관리자 모드가 해제되었습니다.");
    } else {
      const val = prompt("관리자 비밀번호를 입력해주세요:");
      if (val === 'laboon01') {
        setIsAdminMode(true);
        alert("관리자 모드가 활성화되었습니다. 이제 일정 추가/수정/삭제가 가능합니다.");
      } else if (val !== null) {
        alert("비밀번호가 일치하지 않습니다.");
      }
    }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const initialDeepLinkChecked = useRef(false);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenEventDetail = (event: ScheduleEvent) => {
    setSelectedEventForDetail(event);
    const newUrl = `${window.location.origin}${window.location.pathname}?scheduleId=${event.id}`;
    window.history.replaceState({}, document.title, newUrl);
  };

  const handleCloseEventDetail = () => {
    setSelectedEventForDetail(null);
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, newUrl);
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      installPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPromptRef.current) {
      installPromptRef.current.prompt();
      const { outcome } = await installPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        installPromptRef.current = null;
        setCanInstall(false);
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert("아이폰/아이패드에서는 브라우저 하단의 [공유] 버튼(네모 안의 위 화살표)을 누른 후 [홈 화면에 추가]를 클릭하여 앱을 설치하실 수 있습니다! 📲");
      } else {
        alert("브라우저 주소창 우측의 [설치] 버튼을 클릭하거나, 메뉴의 [앱 설치] 또는 [홈 화면에 추가]를 선택하여 앱을 다운로드하실 수 있습니다! 📲");
      }
    }
  };

  useEffect(() => {
    if (syncStatus === 'syncing') {
      const seaEmojis = ['🌊', '🏊', '🐬', '🐳', '🐋', '🦈', '🐙', '🦑', '🐠', '🐡', '🦀', '🦞', '🦐', '🐚', '🐧', '⛵', '🏄', '🚣', '🦦', '🧜', '🦭'];
      setCurrentSyncEmoji(seaEmojis[Math.floor(Math.random() * seaEmojis.length)]);
    }
  }, [syncStatus]);

  const loadDataFromSupabase = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      const loadedEvents = await fetchSchedules();
      setEvents(loadedEvents);
      setSyncStatus('success');

      // Process deep link if not checked yet
      if (!initialDeepLinkChecked.current) {
        initialDeepLinkChecked.current = true;
        const params = new URLSearchParams(window.location.search);
        const scheduleId = params.get('scheduleId');
        if (scheduleId) {
          const matched = loadedEvents.find(e => String(e.id) === String(scheduleId));
          if (matched) {
            setSelectedEventForDetail(matched);
            const targetDate = new Date(matched.date);
            if (!isNaN(targetDate.getTime())) {
              setCurrentCalendarDate(targetDate);
              setSelectedDate(matched.date);
            }
          } else {
            setToastMessage('존재하지 않거나 삭제된 일정입니다.');
            const newUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, newUrl);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching schedules from Supabase:', err);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Supabase Realtime Subscription ──
  useEffect(() => {
    const isSupabaseConfigured = !!(
      (import.meta as any).env.VITE_SUPABASE_URL && (import.meta as any).env.VITE_SUPABASE_ANON_KEY
    );
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime-schedules')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          console.log('Realtime schedules change detected, reloading...');
          loadDataFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_attendees' },
        () => {
          console.log('Realtime attendees change detected, reloading...');
          loadDataFromSupabase();
          // Keep active detail modal in sync
          if (selectedEventForDetail) {
            fetchSchedules().then(updatedList => {
              const matched = updatedList.find(e => String(e.id) === String(selectedEventForDetail.id));
              if (matched) setSelectedEventForDetail(matched);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDataFromSupabase, selectedEventForDetail]);

  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  const handleSaveEvent = async (formEvent: Omit<ScheduleEvent, 'createdAt'>) => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      const isExisting = events.some(e => String(e.id) === String(formEvent.id));
      if (isExisting) {
        const fullEvent: ScheduleEvent = {
          ...formEvent,
          createdAt: events.find(e => String(e.id) === String(formEvent.id))?.createdAt || new Date().toISOString()
        };
        await updateSchedule(fullEvent);
      } else {
        await createSchedule(formEvent);
      }
      await loadDataFromSupabase();
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to save event:', err);
      setSyncStatus('error');
      alert('일정을 저장하는 과정에서 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setIsFormOpen(false);
      setEditingEvent(null);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      await deleteSchedule(id);
      await loadDataFromSupabase();
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to delete event:', err);
      setSyncStatus('error');
      alert('일정을 삭제하는 과정에서 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAttendeeToEvent = async (scheduleId: string, nickname: string, password?: string) => {
    const previousEvents = [...events];
    const previousSelectedEvent = selectedEventForDetail;

    // 1. Optimistic UI update for the event list
    const updatedEvents = events.map(ev => {
      if (String(ev.id) === String(scheduleId)) {
        const list = ev.attendees ? ev.attendees.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!list.includes(nickname)) {
          list.push(nickname);
        }
        return { ...ev, attendees: list.join(', ') };
      }
      return ev;
    });
    setEvents(updatedEvents);

    // Optimistic UI update for active detail modal state
    if (selectedEventForDetail && String(selectedEventForDetail.id) === String(scheduleId)) {
      const list = selectedEventForDetail.attendees 
        ? selectedEventForDetail.attendees.split(',').map(s => s.trim()).filter(Boolean) 
        : [];
      if (!list.includes(nickname)) {
        list.push(nickname);
      }
      setSelectedEventForDetail({
        ...selectedEventForDetail,
        attendees: list.join(', ')
      });
    }

    // 2. Perform DB write quietly in the background
    try {
      await addAttendee(scheduleId, nickname, password);
      // Fetch latest DB state quietly to ensure full synchronization
      const loadedEvents = await fetchSchedules();
      setEvents(loadedEvents);
      const matched = loadedEvents.find(e => String(e.id) === String(scheduleId));
      if (matched) setSelectedEventForDetail(matched);
    } catch (err) {
      console.error('Failed to add participant in DB, rolling back:', err);
      // Rollback to original state on error
      setEvents(previousEvents);
      setSelectedEventForDetail(previousSelectedEvent);
      alert('참석자 등록에 실패했습니다. (중복 등록 여부를 확인해 주세요)');
    }
  };

  const handleRemoveAttendeeFromEvent = async (scheduleId: string, nickname: string, password?: string) => {
    const previousEvents = [...events];
    const previousSelectedEvent = selectedEventForDetail;

    // 1. Optimistic UI update for the event list
    const updatedEvents = events.map(ev => {
      if (String(ev.id) === String(scheduleId)) {
        const list = ev.attendees ? ev.attendees.split(',').map(s => s.trim()).filter(Boolean) : [];
        const filtered = list.filter(n => n !== nickname);
        return { ...ev, attendees: filtered.length > 0 ? filtered.join(', ') : null };
      }
      return ev;
    });
    setEvents(updatedEvents);

    // Optimistic UI update for active detail modal state
    if (selectedEventForDetail && String(selectedEventForDetail.id) === String(scheduleId)) {
      const list = selectedEventForDetail.attendees 
        ? selectedEventForDetail.attendees.split(',').map(s => s.trim()).filter(Boolean) 
        : [];
      const filtered = list.filter(n => n !== nickname);
      setSelectedEventForDetail({
        ...selectedEventForDetail,
        attendees: filtered.length > 0 ? filtered.join(', ') : null
      });
    }

    // 2. Perform DB write quietly in the background
    try {
      await removeAttendee(scheduleId, nickname, password);
      const loadedEvents = await fetchSchedules();
      setEvents(loadedEvents);
      const matched = loadedEvents.find(e => String(e.id) === String(scheduleId));
      if (matched) setSelectedEventForDetail(matched);
    } catch (err: any) {
      console.error('Failed to remove participant in DB, rolling back:', err);
      // Rollback to original state on error
      setEvents(previousEvents);
      setSelectedEventForDetail(previousSelectedEvent);
      throw err;
    }
  };



  const handleNavigateMonth = (offset: number) => {
    setCurrentCalendarDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  const handleSearch = () => {
    setSearchQuery(searchVal);
    if (searchVal.trim()) {
      localStorage.setItem('lastSearchAttendee', searchVal.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchVal('');
    setSearchQuery('');
  };

  const filteredEvents = events.filter(e => {
    if (selectedGatheringType && (!e.gatheringType || e.gatheringType !== selectedGatheringType)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const atts = e.attendees ? e.attendees.toLowerCase() : '';
      if (!atts.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background dot-grid flex justify-center py-0 sm:py-10 relative overflow-hidden">

      {/* ── Ambient Radial Glows & Rotating Circle (Minimalist Modern) ── */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent-secondary/5 blur-[120px] pointer-events-none" />

      {/* Decorative dashed circular outline rotating slowly */}
      <div className="absolute top-16 left-16 w-80 h-80 rounded-full border border-dashed border-accent/10 animate-rotate-slow pointer-events-none hidden lg:block" />
      <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full border border-dashed border-accent-secondary/10 animate-rotate-slow pointer-events-none hidden lg:block" style={{ animationDirection: 'reverse', animationDuration: '40s' }} />

      {/* ── Main App Card ── */}
      <div className="w-full max-w-[448px] bg-card sm:rounded-3xl flex flex-col min-h-screen sm:min-h-[860px] overflow-hidden relative sm:border sm:border-border sm:shadow-lg transition-all duration-300">

        {/* ── Header ── */}
        <header className="relative px-5 pt-7 pb-5 shrink-0 border-b border-border bg-card">
          <div className="relative flex justify-between items-center">
            {/* Title block */}
            <div className="flex flex-col">
              {/* Section badge pattern */}
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                  Gathering Planner
                </span>
              </div>
              <h1 className="font-display text-[26px] tracking-tight text-foreground leading-none mt-1 flex items-center gap-1.5 select-none">
                <span>라분다이브 <span className="gradient-text font-display">캘린더</span></span>
                <button 
                  onClick={handleToggleAdminMode}
                  className={`transition-all duration-200 cursor-pointer p-1 rounded-lg border ${isAdminMode ? 'text-accent border-accent/20 bg-accent/5' : 'text-muted-foreground/30 border-transparent hover:text-accent hover:border-accent/10 hover:bg-accent/5'}`}
                  title={isAdminMode ? '관리자 모드 활성화됨 (클릭 시 해제)' : '관리자 로그인'}
                >
                  <Key className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Toggle Button */}
              <button
                onClick={() => {
                  const nextSearchOpen = !isSearchOpen;
                  setIsSearchOpen(nextSearchOpen);
                  if (!nextSearchOpen) handleClearSearch();
                }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-150 cursor-pointer
                  ${isSearchOpen 
                    ? 'border-accent bg-accent/5 text-accent shadow-sm' 
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}
                title="참석자 검색"
              >
                <Search className="w-4 h-4" strokeWidth={2} />
              </button>

              {/* Install PWA Button ("다운로드") */}
              {!isStandalone && (
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-[10.5px] font-sans font-bold text-[#1E40AF] hover:bg-blue-100 hover:border-blue-300 transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
                  title="앱 다운로드하기"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" strokeWidth={3} />
                  <span>다운로드</span>
                </button>
              )}
            </div>
          </div>

          {/* Expanded Search Bar */}
          {isSearchOpen && (
            <div className="mt-4 flex gap-2 animate-pop-in">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="참석자 이름으로 검색 (예: 길동)"
                className="flex-1 px-4 py-2 border border-border bg-muted/20 rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground/45 transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:bg-card"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent-secondary transition cursor-pointer"
              >
                검색
              </button>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-2 bg-muted text-muted-foreground text-xs font-semibold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  초기화
                </button>
              )}
            </div>
          )}
        </header>

        {/* ── Main content (Scrollable) ── */}
        <main className="flex-1 overflow-y-auto p-5 space-y-6">
          <CalendarView
            selectedDate={selectedDate}
            currentDate={currentCalendarDate}
            events={filteredEvents}
            onSelectDate={setSelectedDate}
            onNavigateMonth={handleNavigateMonth}
            selectedGatheringType={selectedGatheringType}
            onSelectGatheringType={setSelectedGatheringType}
          />

          <EventListView
            selectedDate={selectedDate}
            currentMonth={currentCalendarDate}
            events={filteredEvents}
            onAddEventClick={() => { setEditingEvent(null); setIsFormOpen(true); }}
            onEventClick={handleOpenEventDetail}
            onSelectDate={setSelectedDate}
            searchQuery={searchQuery}
            isAdminMode={isAdminMode}
          />
        </main>

        {/* ── Floating Add Button (Minimal Modern Style) ── */}
        {isAdminMode && (
          <div className="fixed sm:absolute bottom-6 right-5 z-40">
            <button
              onClick={() => { setEditingEvent(null); setIsFormOpen(true); }}
              className="w-14 h-14 bg-gradient-to-r from-accent to-accent-secondary text-white rounded-full shadow-accent hover:-translate-y-1 hover:shadow-accent-lg active:scale-[0.96] flex items-center justify-center transition-all duration-200 cursor-pointer"
              title="일정 추가"
            >
              <Plus className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ── Event Form Modal ── */}
        {isFormOpen && (
          <EventForm
            selectedDate={selectedDate || new Date().toISOString().slice(0, 10)}
            editingEvent={editingEvent}
            onSave={handleSaveEvent}
            onCancel={() => { setIsFormOpen(false); setEditingEvent(null); }}
          />
        )}

        {/* ── Event Detail Modal ── */}
        {selectedEventForDetail && (
        <EventDetailModal
          event={selectedEventForDetail}
          onClose={handleCloseEventDetail}
          onAddAttendee={handleAddAttendeeToEvent}
          onRemoveAttendee={handleRemoveAttendeeFromEvent}
          onEdit={(ev) => {
            setEditingEvent(ev);
            setIsFormOpen(true);
          }}
          onDelete={handleDeleteEvent}
          isAdminMode={isAdminMode}
        />
      )}

        {/* ── Sync Loading Overlay ── */}
        {isLoading && syncStatus === 'syncing' && (
          <div className="fixed inset-0 bg-foreground/20 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="relative flex flex-col items-center bg-card p-8 rounded-3xl border border-border shadow-accent-lg max-w-xs text-center animate-pop-in">
              <div className="relative w-20 h-20 flex items-center justify-center mb-5">
                <div className="absolute inset-0 border-4 border-accent/10 border-t-accent rounded-full animate-spin" />
                <span className="relative text-3xl animate-float z-10 select-none">{currentSyncEmoji}</span>
              </div>
              <h3 className="font-display text-base text-foreground tracking-tight">
                실시간 데이터 동기화 중
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                캘린더 일정을 데이터베이스에 동기화 중입니다.<br />잠시만 기다려주세요!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Global Error/Info Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs font-semibold px-5 py-3 rounded-xl border border-border shadow-lg z-50 animate-pop-in flex items-center gap-2 whitespace-nowrap">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
