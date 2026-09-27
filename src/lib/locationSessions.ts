// Per-location dive session ("부") labels and their real-world time ranges.
// Keys match the `location` field stored on ScheduleEvent (short codes).
//
// A location's session lineup can change over time (e.g. a pool switches to a
// new timetable on a specific date). Each location has one or more versions,
// each with an `effectiveFrom` date (inclusive, YYYY-MM-DD); the version used
// for a given event is the latest one whose `effectiveFrom` is on or before
// that event's date. Versions must be listed in ascending `effectiveFrom`
// order. Locations with no scheduled change just have a single version.
interface LocationScheduleVersion {
  effectiveFrom: string;
  sessions: string[];
  timeRanges: Record<string, string>;
}

const LOCATION_SCHEDULE_VERSIONS: Record<string, LocationScheduleVersion[]> = {
  '딥스': [{
    effectiveFrom: '2000-01-01',
    sessions: ['1부', '2부', '3부', '4부', '5부'],
    timeRanges: { '1부': '8:00~11:00', '2부': '11:00~14:00', '3부': '14:00~17:00', '4부': '17:00~20:00', '5부': '20:00~23:00' },
  }],
  '파라': [{
    effectiveFrom: '2000-01-01',
    sessions: ['1부', '2부', '3부', '4부', '5부'],
    timeRanges: { '1부': '8:00~11:00', '2부': '11:00~14:00', '3부': '14:00~17:00', '4부': '17:00~20:00', '5부': '20:00~23:00' },
  }],
  '밀양': [{
    effectiveFrom: '2000-01-01',
    sessions: ['0부', '1부', '2부', '3부', '4부', '5부', '6부'],
    timeRanges: { '0부': '8:00~10:00', '1부': '10:00~12:00', '2부': '12:00~14:00', '3부': '14:00~16:00', '4부': '16:00~18:00', '5부': '18:00~20:00', '6부': '20:00~22:00' },
  }],
  '북항': [
    {
      effectiveFrom: '2000-01-01',
      sessions: ['1부', '2부'],
      timeRanges: { '1부': '9:30~12:30', '2부': '14:00~17:00' },
    },
    {
      effectiveFrom: '2026-10-01',
      sessions: ['1부', '2부', '3부'],
      timeRanges: { '1부': '12:10~14:40', '2부': '15:10~17:40', '3부': '18:10~20:40' },
    },
  ],
  '패나': [{
    effectiveFrom: '2000-01-01',
    sessions: ['1부', '2부', '3부', '4부'],
    timeRanges: { '1부': '9:00~11:30', '2부': '12:30~15:00', '3부': '16:00~18:30', '4부': '19:30~22:00' },
  }],
  '풀6': [{
    effectiveFrom: '2000-01-01',
    sessions: ['오전', '오후A', '오후B', '야간'],
    timeRanges: { '오전': '9:30~12:00', '오후A': '13:00~15:30', '오후B': '16:00~18:30', '야간': '19:00~21:30' },
  }],
  '두류': [{
    effectiveFrom: '2000-01-01',
    sessions: ['오전', '오후', '야간'],
    timeRanges: { '오전': '9:00~12:30', '오후': '13:00~17:00', '야간': '18:00~21:30' },
  }],
  '문수': [{
    effectiveFrom: '2000-01-01',
    sessions: ['오전', '오후', '야간'],
    timeRanges: { '오전': '9:00~12:00', '오후': '13:00~17:00', '야간': '18:00~21:30' },
  }],
  '알프스': [{
    effectiveFrom: '2000-01-01',
    sessions: ['1부', '2부', '3부', '시간지정'],
    timeRanges: { '1부': '8:00~11:00', '2부': '11:30~14:30', '3부': '15:00~18:00', '시간지정': '입장시간 셀프지정' },
  }],
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveVersion(location: string | null | undefined, dateStr?: string): LocationScheduleVersion | undefined {
  if (!location) return undefined;
  const versions = LOCATION_SCHEDULE_VERSIONS[location];
  if (!versions || versions.length === 0) return undefined;
  const target = dateStr || todayStr();
  let chosen = versions[0];
  for (const v of versions) {
    if (v.effectiveFrom <= target) chosen = v;
    else break;
  }
  return chosen;
}

// The session ("부") button labels available for a location on a given date.
export function getLocationSessions(location: string | null | undefined, dateStr?: string): string[] {
  return resolveVersion(location, dateStr)?.sessions || [];
}

export function getSessionTimeRange(location: string | null | undefined, session: string | null | undefined, dateStr?: string): string {
  if (!location || !session) return '';
  return resolveVersion(location, dateStr)?.timeRanges[session] || '';
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
