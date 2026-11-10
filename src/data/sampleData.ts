import {
  AppSettings,
  AttendanceLogEntry,
  HolidayOrCancelled,
  Subject,
  TimetableSlot,
} from '../types/attendance';

export const DEFAULT_SETTINGS: AppSettings = {
  targetPercentage: 75,
  warningBufferPercentage: 3,
  studentName: 'Alex Rivera',
  semesterName: 'Autumn Semester · B.Tech CS',
  includeSaturday: true,
};

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'subj-1',
    name: 'Data Structures & Algorithms',
    code: 'CS-301',
    conducted: 40,
    attended: 27, // 67.5% -> Needs 12 consecutive classes to reach 75% (27+12)/(40+12) = 39/52 = 75%
    periodsPerWeek: 4,
    professor: 'Dr. Elena Vance',
    color: '#38BDF8',
  },
  {
    id: 'subj-2',
    name: 'Operating Systems Architecture',
    code: 'CS-302',
    conducted: 36,
    attended: 31, // 86.11% -> Safe margin, can miss 5 classes (31/41 = 75.6%)
    periodsPerWeek: 4,
    professor: 'Prof. Marcus Chen',
    color: '#10B981',
  },
  {
    id: 'subj-3',
    name: 'Database Management Systems',
    code: 'CS-303',
    conducted: 32,
    attended: 24, // 75.00% -> Exactly on threshold (0 safe absences, 0 required)
    periodsPerWeek: 3,
    professor: 'Dr. Priya Nair',
    color: '#F59E0B',
  },
  {
    id: 'subj-4',
    name: 'Computer Networks & Security',
    code: 'CS-304',
    conducted: 28,
    attended: 19, // 67.86% -> Needs 8 consecutive classes (19+8)/(28+8) = 27/36 = 75%
    periodsPerWeek: 3,
    professor: 'Prof. David Lindqvist',
    color: '#F43F5E',
  },
  {
    id: 'subj-5',
    name: 'Discrete Mathematics & Logic',
    code: 'MA-204',
    conducted: 30,
    attended: 26, // 86.67% -> Safe margin, can miss 4 classes (26/34 = 76.47%)
    periodsPerWeek: 3,
    professor: 'Dr. Sarah Jenkins',
    color: '#A855F7',
  },
  {
    id: 'subj-6',
    name: 'Software Engineering Studio',
    code: 'SE-310',
    conducted: 24,
    attended: 20, // 83.33% -> Safe margin, can miss 2 classes (20/26 = 76.92%)
    periodsPerWeek: 2,
    professor: 'Prof. Liam O’Connor',
    color: '#EC4899',
  },
];

export const INITIAL_TIMETABLE: TimetableSlot[] = [
  // Monday
  { id: 'slot-1', subjectId: 'subj-1', dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', room: 'Hall 301' },
  { id: 'slot-2', subjectId: 'subj-2', dayOfWeek: 'Monday', startTime: '10:00', endTime: '11:00', room: 'Lab 2B' },
  { id: 'slot-3', subjectId: 'subj-3', dayOfWeek: 'Monday', startTime: '11:30', endTime: '12:30', room: 'Hall 104' },
  { id: 'slot-4', subjectId: 'subj-5', dayOfWeek: 'Monday', startTime: '14:00', endTime: '15:00', room: 'Room 208' },
  // Tuesday
  { id: 'slot-5', subjectId: 'subj-4', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '10:00', room: 'NetLab 1' },
  { id: 'slot-6', subjectId: 'subj-1', dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '11:00', room: 'Hall 301' },
  { id: 'slot-7', subjectId: 'subj-6', dayOfWeek: 'Tuesday', startTime: '13:30', endTime: '14:30', room: 'Studio A' },
  // Wednesday
  { id: 'slot-8', subjectId: 'subj-2', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:00', room: 'Lab 2B' },
  { id: 'slot-9', subjectId: 'subj-3', dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '11:00', room: 'Hall 104' },
  { id: 'slot-10', subjectId: 'subj-5', dayOfWeek: 'Wednesday', startTime: '11:30', endTime: '12:30', room: 'Room 208' },
  { id: 'slot-11', subjectId: 'subj-4', dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '15:00', room: 'NetLab 1' },
  // Thursday
  { id: 'slot-12', subjectId: 'subj-1', dayOfWeek: 'Thursday', startTime: '09:00', endTime: '10:00', room: 'Hall 301' },
  { id: 'slot-13', subjectId: 'subj-2', dayOfWeek: 'Thursday', startTime: '11:00', endTime: '12:00', room: 'Lab 2B' },
  { id: 'slot-14', subjectId: 'subj-6', dayOfWeek: 'Thursday', startTime: '14:00', endTime: '15:00', room: 'Studio A' },
  // Friday
  { id: 'slot-15', subjectId: 'subj-3', dayOfWeek: 'Friday', startTime: '09:00', endTime: '10:00', room: 'Hall 104' },
  { id: 'slot-16', subjectId: 'subj-4', dayOfWeek: 'Friday', startTime: '10:00', endTime: '11:00', room: 'NetLab 1' },
  { id: 'slot-17', subjectId: 'subj-1', dayOfWeek: 'Friday', startTime: '11:30', endTime: '12:30', room: 'Hall 301' },
  // Saturday
  { id: 'slot-18', subjectId: 'subj-2', dayOfWeek: 'Saturday', startTime: '09:30', endTime: '10:30', room: 'Lab 2B' },
  { id: 'slot-19', subjectId: 'subj-5', dayOfWeek: 'Saturday', startTime: '10:30', endTime: '11:30', room: 'Room 208' },
];

export const INITIAL_HOLIDAYS: HolidayOrCancelled[] = [
  {
    id: 'hol-1',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    type: 'cancelled',
    subjectId: 'subj-1',
    reason: 'Faculty Research Symposium (CS-301 Lecture Cancelled)',
  },
  {
    id: 'hol-2',
    date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    type: 'holiday',
    reason: 'University Founders Day Academic Holiday',
  },
];

export const INITIAL_HISTORY: AttendanceLogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    date: new Date().toISOString().split('T')[0],
    subjectId: 'subj-1',
    subjectName: 'Data Structures & Algorithms',
    action: 'attended',
    previousAttended: 26,
    previousConducted: 39,
    newAttended: 27,
    newConducted: 40,
    note: 'Attended morning lecture in Hall 301',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 26).toISOString(),
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    subjectId: 'subj-4',
    subjectName: 'Computer Networks & Security',
    action: 'missed',
    previousAttended: 19,
    previousConducted: 27,
    newAttended: 19,
    newConducted: 28,
    note: 'Missed morning lab session',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 3600000 * 50).toISOString(),
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    subjectId: 'subj-2',
    subjectName: 'Operating Systems Architecture',
    action: 'attended',
    previousAttended: 30,
    previousConducted: 35,
    newAttended: 31,
    newConducted: 36,
    note: 'Kernel scheduling seminar attended',
  },
];
