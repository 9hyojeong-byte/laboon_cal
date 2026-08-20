// Per-location dive session ("부") labels and their real-world time ranges.
// Keys match the `location` field stored on ScheduleEvent (short codes).
export const LOCATION_SESSIONS: Record<string, string[]> = {
  '딥스': ['1부', '2부', '3부', '4부', '5부'],
  '파라': ['1부', '2부', '3부', '4부', '5부'],
  '밀양': ['0부', '1부', '2부', '3부', '4부', '5부'],
  '북항': ['1부', '2부'],
  '패나': ['1부', '2부', '3부', '4부'],
  '풀6': ['오전', '오후A', '오후B', '야간'],
  '두류': ['오전', '오후', '야간'],
  '문수': ['오전', '오후', '야간'],
  '알프스': ['1부', '2부', '3부', '시간지정'],
};

export const SESSION_TIME_RANGES: Record<string, Record<string, string>> = {
  '딥스': { '1부': '8:00~11:00', '2부': '11:00~14:00', '3부': '14:00~17:00', '4부': '17:00~20:00', '5부': '20:00~23:00' },
  '파라': { '1부': '8:00~11:00', '2부': '11:00~14:00', '3부': '14:00~17:00', '4부': '17:00~20:00', '5부': '20:00~23:00' },
  '밀양': { '0부': '8:00~10:00', '1부': '10:00~12:00', '2부': '12:00~14:00', '3부': '14:00~16:00', '4부': '16:00~18:00', '5부': '20:00~22:00' },
  '북항': { '1부': '9:30~12:30', '2부': '14:00~17:00' },
  '패나': { '1부': '9:00~11:30', '2부': '12:30~15:00', '3부': '16:00~18:30', '4부': '19:30~22:00' },
  '풀6': { '오전': '9:30~12:00', '오후A': '13:00~15:30', '오후B': '16:00~18:30', '야간': '19:00~21:30' },
  '두류': { '오전': '9:00~12:30', '오후': '13:00~17:00', '야간': '18:00~21:30' },
  '문수': { '오전': '9:00~12:00', '오후': '13:00~17:00', '야간': '18:00~21:30' },
  '알프스': { '1부': '8:00~11:00', '2부': '11:30~14:30', '3부': '15:00~18:00', '시간지정': '입장시간 셀프지정' },
};

export function getSessionTimeRange(location: string | null | undefined, session: string | null | undefined): string {
  if (!location || !session) return '';
  return SESSION_TIME_RANGES[location]?.[session] || '';
}

const LOCATION_FULL_NAMES: Record<string, string> = {
  '딥스': '딥스테이션',
  '파라': '파라다이브',
  '밀양': '밀양잠수풀',
  '북항': '북항마리나',
  '패나': '패스나인',
  '두류': '두류잠수풀',
  '문수': '문수실내수영장',
};

export function formatLocationName(loc: string | null | undefined): string {
  if (!loc) return '일반';
  const trimmed = loc.trim();
  return LOCATION_FULL_NAMES[trimmed] || trimmed;
}
