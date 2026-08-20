export interface ScheduleEvent {
  id: string; // Google Sheet row index, or a unique UUID
  title: string;
  date: string; // YYYY-MM-DD (Start Date)
  endDate?: string | null; // YYYY-MM-DD (End Date)
  startTime: string | null; // HH:MM, or part like "1부" etc
  endTime: string | null; // HH:MM
  description: string | null;
  createdAt: string;
  location?: string | null; // Location (딥스, 파라, 밀양, 북항, 패나, 풀6, 두류, 문수, 알프스, 자유일정)
  attendees?: string | null; // Comma-separated or similar string of attendee names
  deepTankUsage?: string | null; // 딥탱크 이용시간: "전반부이", "후반부이" 등
  company?: string | null; // 업체명
  gatheringType?: string | null; // 벙 타입
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

