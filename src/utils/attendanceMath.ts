import {
  AttendanceGoalMode,
  AttendanceStatus,
  HolidayOrCancelled,
  OverallSummary,
  Subject,
  SubjectCalculation,
  TimetableSlot,
  DayOfWeek,
} from '../types/attendance';

/**
 * Exact discrete mathematical engine for attendance calculation.
 *
 * Key Formulas:
 * 1. Attendance Percentage = (Classes Attended / Total Classes Conducted) * 100
 * 2. Consecutive Classes Required to Reach Target T% (where t = T / 100):
 *     Since attending R consecutive classes increases BOTH attended and conducted by R:
 *    (Attended + R) / (Conducted + R) >= t
 *    Attended + R >= t * Conducted + t * R
 *    R * (1 - t) >= t * Conducted - Attended
 *    R = Ceiling((t * Conducted - Attended) / (1 - t))
 *    For T = 75%: Required = Ceiling((0.75 * Conducted - Attended) / 0.25)
 *
 * 3. Safe Additional Absences Allowed while Maintaining >= T%:
 *    Since missing M classes increases Conducted by M while Attended stays constant:
 *    Attended / (Conducted + M) >= t
 *    Attended >= t * Conducted + t * M
 *    M = Floor((Attended - t * Conducted) / t)
 *    For T = 75%: Safe Misses = Floor((Attended - 0.75 * Conducted) / 0.75)
 */

export function calculatePercentage(attended: number, conducted: number): number {
  if (conducted <= 0) return 100;
  const raw = (attended / conducted) * 100;
  return Math.round(raw * 100) / 100;
}

export function calculateRequiredConsecutiveClasses(
  attended: number,
  conducted: number,
  targetPercentage: number = 75
): number {
  if (conducted <= 0) return 0;
  const t = Math.min(0.99, Math.max(0.01, targetPercentage / 100));
  const currentRatio = attended / conducted;

  if (currentRatio >= t - 1e-9) {
    return 0;
  }

  const numerator = t * conducted - attended;
  const denominator = 1 - t;
  // Subtract tiny epsilon to avoid floating point precision pushing exact integers up by 1
  const required = Math.ceil(numerator / denominator - 1e-9);
  return Math.max(0, required);
}

export function calculateSafeAbsencesAllowed(
  attended: number,
  conducted: number,
  targetPercentage: number = 75
): number {
  if (conducted <= 0) return 0;
  const t = Math.min(0.99, Math.max(0.01, targetPercentage / 100));
  const currentRatio = attended / conducted;

  if (currentRatio < t - 1e-9) {
    return 0;
  }

  const numerator = attended - t * conducted;
  const safeMisses = Math.floor(numerator / t + 1e-9);
  return Math.max(0, safeMisses);
}

export function evaluateSubject(
  subject: Subject,
  targetPercentage: number = 75,
  warningBuffer: number = 3
): SubjectCalculation {
  const conducted = Math.max(0, subject.conducted);
  const attended = Math.min(conducted, Math.max(0, subject.attended));
  const absent = Math.max(0, conducted - attended);
  const percentage = calculatePercentage(attended, conducted);

  const classesNeeded = calculateRequiredConsecutiveClasses(attended, conducted, targetPercentage);
  const safeAbsences = calculateSafeAbsencesAllowed(attended, conducted, targetPercentage);

  let status: AttendanceStatus = 'safe';
  let statusLabel = `Above ${targetPercentage}% · Safe Margin`;

  if (percentage < targetPercentage) {
    status = 'danger';
    statusLabel = `Below ${targetPercentage}% · Action Required`;
  } else if (percentage < targetPercentage + warningBuffer || safeAbsences === 0) {
    status = 'warning';
    statusLabel = `Close to ${targetPercentage}% · Borderline`;
  }

  // Distinguish clearly between:
  // - Recovering from attendance below target
  // - Reaching exact target / borderline threshold
  // - Maintaining at least target with buffer
  let goalMode: AttendanceGoalMode = 'maintaining';
  let goalModeLabel = `Maintaining ≥${targetPercentage}%`;

  if (percentage < targetPercentage) {
    goalMode = 'recovering';
    goalModeLabel = `Recovering from <${targetPercentage}%`;
  } else if (safeAbsences === 0) {
    goalMode = 'reaching';
    goalModeLabel = `Holding at ${targetPercentage}% Threshold`;
  }

  const estimatedWeeksToRecover =
    classesNeeded > 0 && subject.periodsPerWeek > 0
      ? Math.ceil((classesNeeded / subject.periodsPerWeek) * 10) / 10
      : null;

  const nextIfAttendPercentage = calculatePercentage(attended + 1, conducted + 1);
  const nextIfMissPercentage = calculatePercentage(attended, conducted + 1);

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    subjectCode: subject.code,
    conducted,
    attended,
    absent,
    percentage,
    targetPercentage,
    status,
    statusLabel,
    goalMode,
    goalModeLabel,
    classesNeededToReachTarget: classesNeeded,
    safeAbsencesAllowed: safeAbsences,
    estimatedWeeksToRecover,
    nextIfAttendPercentage,
    nextIfMissPercentage,
  };
}

export function evaluateOverallSummary(
  subjects: Subject[],
  targetPercentage: number = 75,
  warningBuffer: number = 3
): OverallSummary {
  const totalSubjects = subjects.length;
  const totalConducted = subjects.reduce((sum, s) => sum + Math.max(0, s.conducted), 0);
  const totalAttended = subjects.reduce((sum, s) => sum + Math.min(s.conducted, Math.max(0, s.attended)), 0);
  const totalMissed = Math.max(0, totalConducted - totalAttended);

  const overallPercentage =
    totalConducted > 0 ? calculatePercentage(totalAttended, totalConducted) : 100;

  const overallClassesNeeded = calculateRequiredConsecutiveClasses(
    totalAttended,
    totalConducted,
    targetPercentage
  );
  const overallSafeAbsences = calculateSafeAbsencesAllowed(
    totalAttended,
    totalConducted,
    targetPercentage
  );

  const subjectCalcs = subjects.map((s) => evaluateSubject(s, targetPercentage, warningBuffer));

  const subjectsBelowTarget = subjectCalcs.filter((c) => c.percentage < targetPercentage).length;
  const subjectsCloseToTarget = subjectCalcs.filter(
    (c) => c.percentage >= targetPercentage && c.status === 'warning'
  ).length;
  const subjectsSafelyAboveTarget = subjectCalcs.filter((c) => c.status === 'safe').length;
  const totalSubjectConsecutiveRequired = subjectCalcs.reduce(
    (sum, c) => sum + c.classesNeededToReachTarget,
    0
  );

  let status: AttendanceStatus = 'safe';
  let statusLabel = `Above ${targetPercentage}% Target`;

  if (overallPercentage < targetPercentage) {
    status = 'danger';
    statusLabel = `Below ${targetPercentage}% Target`;
  } else if (overallPercentage < targetPercentage + warningBuffer || overallSafeAbsences === 0) {
    status = 'warning';
    statusLabel = `Close to ${targetPercentage}% Threshold`;
  }

  return {
    totalSubjects,
    totalConducted,
    totalAttended,
    totalMissed,
    overallPercentage,
    targetPercentage,
    status,
    statusLabel,
    subjectsBelowTarget,
    subjectsCloseToTarget,
    subjectsSafelyAboveTarget,
    overallClassesNeeded,
    overallSafeAbsences,
    totalSubjectConsecutiveRequired,
  };
}

export interface SimulationOutcome {
  baseAttended: number;
  baseConducted: number;
  basePercentage: number;
  projectedAttended: number;
  projectedConducted: number;
  projectedPercentage: number;
  percentageDelta: number;
  status: AttendanceStatus;
  remainingNeededAfterSim: number;
  remainingSafeBunksAfterSim: number;
}

export function simulateAttendanceScenario(
  attended: number,
  conducted: number,
  attendFutureCount: number,
  missFutureCount: number,
  targetPercentage: number = 75,
  warningBuffer: number = 3
): SimulationOutcome {
  const basePercentage = calculatePercentage(attended, conducted);
  const projectedAttended = attended + Math.max(0, attendFutureCount);
  const projectedConducted =
    conducted + Math.max(0, attendFutureCount) + Math.max(0, missFutureCount);
  const projectedPercentage = calculatePercentage(projectedAttended, projectedConducted);
  const percentageDelta = Math.round((projectedPercentage - basePercentage) * 100) / 100;

  const remainingNeededAfterSim = calculateRequiredConsecutiveClasses(
    projectedAttended,
    projectedConducted,
    targetPercentage
  );
  const remainingSafeBunksAfterSim = calculateSafeAbsencesAllowed(
    projectedAttended,
    projectedConducted,
    targetPercentage
  );

  let status: AttendanceStatus = 'safe';
  if (projectedPercentage < targetPercentage) {
    status = 'danger';
  } else if (
    projectedPercentage < targetPercentage + warningBuffer ||
    remainingSafeBunksAfterSim === 0
  ) {
    status = 'warning';
  }

  return {
    baseAttended: attended,
    baseConducted: conducted,
    basePercentage,
    projectedAttended,
    projectedConducted,
    projectedPercentage,
    percentageDelta,
    status,
    remainingNeededAfterSim,
    remainingSafeBunksAfterSim,
  };
}

const DAY_INDEX_MAP: Record<number, DayOfWeek | null> = {
  0: null, // Sunday
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export interface UpcomingPredictedSlot {
  dateStr: string;
  displayDate: string;
  dayOfWeek: DayOfWeek;
  slotId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  room?: string;
  isHolidayOrCancelled: boolean;
  exemptionReason?: string;
  ifAttendPct: number;
  ifMissPct: number;
}

/**
 * Predicts upcoming scheduled classes over the next N days using the weekly timetable
 * and accounts for marked holidays & cancelled classes.
 */
export function predictUpcomingSchedule(
  subjects: Subject[],
  slots: TimetableSlot[],
  holidays: HolidayOrCancelled[],
  daysAhead: number = 7
): UpcomingPredictedSlot[] {
  const results: UpcomingPredictedSlot[] = [];
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const today = new Date();

  for (let offset = 0; offset < daysAhead; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const dayName = DAY_INDEX_MAP[d.getDay()];
    if (!dayName) continue;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const displayDate = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const daySlots = slots
      .filter((s) => s.dayOfWeek === dayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (const slot of daySlots) {
      const subj = subjectMap.get(slot.subjectId);
      if (!subj) continue;

      const matchingExemption = holidays.find(
        (h) =>
          h.date === dateStr &&
          (h.type === 'holiday' || !h.subjectId || h.subjectId === subj.id)
      );

      const isExempt = Boolean(matchingExemption);
      const ifAttendPct = isExempt
        ? calculatePercentage(subj.attended, subj.conducted)
        : calculatePercentage(subj.attended + 1, subj.conducted + 1);
      const ifMissPct = isExempt
        ? calculatePercentage(subj.attended, subj.conducted)
        : calculatePercentage(subj.attended, subj.conducted + 1);

      results.push({
        dateStr,
        displayDate,
        dayOfWeek: dayName,
        slotId: slot.id,
        subjectId: subj.id,
        subjectName: subj.name,
        subjectCode: subj.code,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        isHolidayOrCancelled: isExempt,
        exemptionReason: matchingExemption?.reason,
        ifAttendPct,
        ifMissPct,
      });
    }
  }

  return results;
}
