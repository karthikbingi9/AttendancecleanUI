export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface Subject {
  id: string;
  name: string;
  code: string;
  conducted: number;
  attended: number;
  periodsPerWeek: number;
  professor?: string;
  color: string;
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  room?: string;
}

export interface HolidayOrCancelled {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'holiday' | 'cancelled';
  subjectId?: string; // undefined means full-day holiday for all subjects
  reason: string;
}

export interface AttendanceLogEntry {
  id: string;
  timestamp: string;
  date: string;
  subjectId: string;
  subjectName: string;
  action: 'attended' | 'missed' | 'cancelled' | 'manual_edit' | 'simulation_applied';
  previousAttended: number;
  previousConducted: number;
  newAttended: number;
  newConducted: number;
  note?: string;
}

export interface AppSettings {
  targetPercentage: number; // Default 75
  warningBufferPercentage: number; // Default 3 (so 75% to 78% is Yellow / Close to target)
  studentName: string;
  semesterName: string;
  includeSaturday: boolean;
}

export type NavigationTab =
  | 'dashboard'
  | 'timetable'
  | 'subjects'
  | 'calculator'
  | 'analytics'
  | 'settings';

export type AttendanceStatus = 'safe' | 'warning' | 'danger';

export type AttendanceGoalMode = 'maintaining' | 'reaching' | 'recovering';

export interface SubjectCalculation {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  conducted: number;
  attended: number;
  absent: number;
  percentage: number;
  targetPercentage: number;
  status: AttendanceStatus;
  statusLabel: string;
  goalMode: AttendanceGoalMode;
  goalModeLabel: string;
  classesNeededToReachTarget: number;
  safeAbsencesAllowed: number;
  estimatedWeeksToRecover: number | null;
  nextIfAttendPercentage: number;
  nextIfMissPercentage: number;
}

export interface OverallSummary {
  totalSubjects: number;
  totalConducted: number;
  totalAttended: number;
  totalMissed: number;
  overallPercentage: number;
  targetPercentage: number;
  status: AttendanceStatus;
  statusLabel: string;
  subjectsBelowTarget: number;
  subjectsCloseToTarget: number;
  subjectsSafelyAboveTarget: number;
  overallClassesNeeded: number;
  overallSafeAbsences: number;
  totalSubjectConsecutiveRequired: number;
}
