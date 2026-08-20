import { supabase } from './supabaseClient';
import { ScheduleEvent } from '../types';

const isSupabaseConfigured = !!(
  (import.meta as any).env.VITE_SUPABASE_URL && (import.meta as any).env.VITE_SUPABASE_ANON_KEY
);

const LOCAL_STORAGE_KEY = 'raboon_supabase_fallback_schedules';

// Initialize mock data for fallback
const getMockData = (): ScheduleEvent[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) {
    try { return JSON.parse(data); } catch { return []; }
  }
  const defaultMock: ScheduleEvent[] = [
    {
      id: 'mock-1',
      title: '범고래/성남/12시/트레이닝',
      date: new Date().toISOString().split('T')[0],
      startTime: '12:00',
      endTime: '15:00',
      description: '버디 구함. 라이선스 소지자만!',
      location: '성남',
      deepTankUsage: null,
      attendees: '범고래, 아쿠아, 마린',
      company: '성남아쿠아라인',
      gatheringType: '트레이닝',
      createdAt: new Date().toISOString()
    }
  ];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultMock));
  return defaultMock;
};

const saveMockData = (events: ScheduleEvent[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
};

/**
 * Fetch all schedules (not soft-deleted) along with their attendees
 */
export async function fetchSchedules(): Promise<ScheduleEvent[]> {
  if (!isSupabaseConfigured) {
    console.log('Using LocalStorage fallback database');
    return getMockData();
  }

  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      schedule_attendees (
        nickname
      )
    `)
    .is('deleted_at', null)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch schedules from Supabase:', error);
    throw error;
  }

  return (data || []).map((row: any) => {
    // Map list of attendee objects to a comma separated string
    const attendeesList = row.schedule_attendees
      ? row.schedule_attendees.map((a: any) => a.nickname)
      : [];
    return {
      id: row.id,
      title: row.title,
      date: row.start_date,
      endDate: row.end_date || null,
      startTime: row.start_time || null,
      endTime: row.end_time || null,
      description: row.description || null,
      location: row.location || null,
      deepTankUsage: row.deep_tank_usage || null,
      company: row.company || null,
      gatheringType: row.gathering_type || null,
      createdAt: row.created_at,
      attendees: attendeesList.join(', '),
    };
  });
}

/**
 * Create a new schedule and insert its first attendee (the creator)
 */
export async function createSchedule(event: Omit<ScheduleEvent, 'createdAt'>): Promise<void> {
  if (!isSupabaseConfigured) {
    const mock = getMockData();
    const newEvent: ScheduleEvent = {
      ...event,
      createdAt: new Date().toISOString()
    };
    mock.push(newEvent);
    saveMockData(mock);
    return;
  }

  // 1. Insert schedule row
  const insertData: any = {
    title: event.title,
    description: event.description,
    start_date: event.date,
    end_date: event.endDate || null,
    start_time: event.startTime || null,
    end_time: event.endTime || null,
    location: event.location || null,
    company: event.company || null,
    gathering_type: event.gatheringType || null,
    deep_tank_usage: event.deepTankUsage || null,
  };

  // Only pass id if it is a valid UUID (not generated client string like 'event-...')
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (event.id && uuidRegex.test(event.id)) {
    insertData.id = event.id;
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create schedule in Supabase:', error);
    throw error;
  }

  // 2. Insert creator as first attendee
  if (event.attendees) {
    const firstAttendee = event.attendees.split(',')[0].trim();
    if (firstAttendee) {
      const { error: attendeeErr } = await supabase
        .from('schedule_attendees')
        .insert({
          schedule_id: data.id,
          nickname: firstAttendee,
        });
      if (attendeeErr) {
        console.error('Failed to insert first attendee in Supabase:', attendeeErr);
      }
    }
  }
}

/**
 * Update an existing schedule and synchonize the creator nickname
 */
export async function updateSchedule(event: ScheduleEvent): Promise<void> {
  if (!isSupabaseConfigured) {
    const mock = getMockData();
    const idx = mock.findIndex(e => e.id === event.id);
    if (idx !== -1) {
      mock[idx] = event;
      saveMockData(mock);
    }
    return;
  }

  // 1. Update schedule info
  const { error } = await supabase
    .from('schedules')
    .update({
      title: event.title,
      description: event.description,
      start_date: event.date,
      end_date: event.endDate || null,
      start_time: event.startTime || null,
      end_time: event.endTime || null,
      location: event.location || null,
      company: event.company || null,
      gathering_type: event.gatheringType || null,
      deep_tank_usage: event.deepTankUsage || null,
    })
    .eq('id', event.id);

  if (error) {
    console.error('Failed to update schedule in Supabase:', error);
    throw error;
  }

  // 2. Sync creator name (first element in list)
  if (event.attendees) {
    const firstAttendee = event.attendees.split(',')[0].trim();
    if (firstAttendee) {
      const { data: currentAttendees } = await supabase
        .from('schedule_attendees')
        .select('nickname')
        .eq('schedule_id', event.id)
        .order('created_at', { ascending: true });

      if (currentAttendees && currentAttendees.length > 0) {
        const currentLeader = currentAttendees[0].nickname;
        if (currentLeader !== firstAttendee) {
          await supabase
            .from('schedule_attendees')
            .update({ nickname: firstAttendee })
            .eq('schedule_id', event.id)
            .eq('nickname', currentLeader);
        }
      } else {
        await supabase
          .from('schedule_attendees')
          .insert({
            schedule_id: event.id,
            nickname: firstAttendee
          });
      }
    }
  }
}

/**
 * Soft delete a schedule by setting deleted_at timestamp
 */
export async function deleteSchedule(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const mock = getMockData();
    const filtered = mock.filter(e => e.id !== id);
    saveMockData(filtered);
    return;
  }

  const { error } = await supabase
    .from('schedules')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to soft delete schedule in Supabase:', error);
    throw error;
  }
}

/**
 * Add a participant to the schedule attendees list
 */
export async function addAttendee(scheduleId: string, nickname: string, password?: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const mock = getMockData();
    const idx = mock.findIndex(e => e.id === scheduleId);
    if (idx !== -1) {
      const ev = mock[idx];
      const list = ev.attendees ? ev.attendees.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (!list.includes(nickname)) {
        list.push(nickname);
        ev.attendees = list.join(', ');
        saveMockData(mock);
        if (password) {
          localStorage.setItem(`raboon_pwd_${scheduleId}_${nickname}`, password);
        }
      }
    }
    return;
  }

  const { error } = await supabase
    .from('schedule_attendees')
    .insert({
      schedule_id: scheduleId,
      nickname: nickname,
      password_hash: password || null,
    });

  if (error) {
    console.error('Failed to add attendee in Supabase:', error);
    throw error;
  }
}

/**
 * Remove a participant from the schedule attendees list
 */
export async function removeAttendee(scheduleId: string, nickname: string, password?: string, isAdmin?: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    const storedPwd = localStorage.getItem(`raboon_pwd_${scheduleId}_${nickname}`) || '';
    if (!isAdmin && storedPwd && storedPwd !== password) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
    const mock = getMockData();
    const idx = mock.findIndex(e => e.id === scheduleId);
    if (idx !== -1) {
      const ev = mock[idx];
      const list = ev.attendees ? ev.attendees.split(',').map(s => s.trim()).filter(Boolean) : [];
      const filtered = list.filter(n => n !== nickname);
      ev.attendees = filtered.length > 0 ? filtered.join(', ') : null;
      saveMockData(mock);
      localStorage.removeItem(`raboon_pwd_${scheduleId}_${nickname}`);
    }
    return;
  }

  // Fetch the attendee to verify the password_hash first
  const { data, error: fetchErr } = await supabase
    .from('schedule_attendees')
    .select('password_hash')
    .eq('schedule_id', scheduleId)
    .eq('nickname', nickname)
    .maybeSingle();

  if (fetchErr) {
    console.error('Failed to verify attendee password in Supabase:', fetchErr);
    throw new Error('참석 정보를 확인하는 과정에서 오류가 발생했습니다.');
  }

  if (!isAdmin && data && data.password_hash) {
    if (data.password_hash !== password) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
  }

  const { error } = await supabase
    .from('schedule_attendees')
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('nickname', nickname);

  if (error) {
    console.error('Failed to remove attendee in Supabase:', error);
    throw error;
  }
}
