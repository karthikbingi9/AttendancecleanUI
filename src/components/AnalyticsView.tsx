import React, { useState } from 'react';
import {
  AttendanceLogEntry,
  OverallSummary,
  Subject,
  SubjectCalculation,
} from '../types/attendance';
import { calculatePercentage } from '../utils/attendanceMath';
import {
  BarChart3,
  TrendingUp,
  History,
  Trash2,
} from 'lucide-react';

interface AnalyticsViewProps {
  summary: OverallSummary;
  subjects: Subject[];
  subjectCalcs: SubjectCalculation[];
  history: AttendanceLogEntry[];
  onClearHistory: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  summary,
  subjects,
  subjectCalcs,
  history,
  onClearHistory,
}) => {
  const [selectedTrajectorySubjectId, setSelectedTrajectorySubjectId] = useState<string>(
    subjects[0]?.id || 'ALL'
  );
  const [confirmClearHistory, setConfirmClearHistory] = useState<boolean>(false);

  const selectedSubj =
    selectedTrajectorySubjectId === 'ALL'
      ? null
      : subjects.find((s) => s.id === selectedTrajectorySubjectId) || null;

  const baseAttended = selectedSubj ? selectedSubj.attended : summary.totalAttended;
  const baseConducted = selectedSubj ? selectedSubj.conducted : summary.totalConducted;
  const weeklyPeriods = selectedSubj
    ? selectedSubj.periodsPerWeek
    : subjects.reduce((acc, s) => acc + s.periodsPerWeek, 0);

  // Build 4-week future trajectory points under 3 strategies:
  // 1. 100% Attendance (attend all weekly classes)
  // 2. 75% Attendance (attend ~3/4 of weekly classes)
  // 3. 50% Attendance (miss half of weekly classes)
  const weeks = [0, 1, 2, 3, 4];
  const trajectoryPoints = weeks.map((weekNum) => {
    const addedConducted = weekNum * Math.max(1, weeklyPeriods);
    const pctPerfect = calculatePercentage(
      baseAttended + addedConducted,
      baseConducted + addedConducted
    );
    const pctModerate = calculatePercentage(
      baseAttended + Math.round(addedConducted * 0.75),
      baseConducted + addedConducted
    );
    const pctLow = calculatePercentage(
      baseAttended + Math.round(addedConducted * 0.5),
      baseConducted + addedConducted
    );

    return {
      weekLabel: weekNum === 0 ? 'Now' : `+${weekNum} Wk`,
      pctPerfect,
      pctModerate,
      pctLow,
    };
  });

  return (
    <div className="space-y-8">
      {/* Top Row: Subject Comparison Horizontal Bar Chart + 4-Week Schedule Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Visual Subject Attendance Comparison Chart */}
        <div className="lg:col-span-6 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Subject Distribution</span>
            </div>
            <h2 className="text-xl font-semibold text-white mt-0.5">
              Subject-Wise Attendance vs. {summary.targetPercentage}% Target
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Visual comparison showing exact distance from the mandatory {summary.targetPercentage}% line
            </p>

            <div className="space-y-4 mt-6">
              {subjectCalcs.map((calc) => {
                const barColor =
                  calc.status === 'safe'
                    ? '#10B981'
                    : calc.status === 'warning'
                    ? '#F59E0B'
                    : '#F43F5E';

                return (
                  <div key={calc.subjectId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sky-400 font-medium shrink-0">
                          {calc.subjectCode}
                        </span>
                        <span className="text-slate-200 truncate">{calc.subjectName}</span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-white shrink-0">
                        {calc.percentage.toFixed(1)}% ({calc.attended}/{calc.conducted})
                      </span>
                    </div>

                    <div className="relative h-3 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, calc.percentage)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_#fff]"
                        style={{ left: `${summary.targetPercentage}%` }}
                        title={`Target ${summary.targetPercentage}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <span>Green: Safely Above {summary.targetPercentage}%</span>
            <span>Yellow: Borderline</span>
            <span>Red: Below {summary.targetPercentage}%</span>
          </div>
        </div>

        {/* Right 6 Cols: 4-Week Schedule-Aware Attendance Trajectory */}
        <div className="lg:col-span-6 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Future Trajectory Forecast</span>
                </div>
                <h2 className="text-xl font-semibold text-white mt-0.5">
                  4-Week Attendance Projection
                </h2>
              </div>

              <select
                value={selectedTrajectorySubjectId}
                onChange={(e) => setSelectedTrajectorySubjectId(e.target.value)}
                className="bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">All Subjects ({weeklyPeriods} periods/wk)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} ({s.periodsPerWeek} periods/wk)
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Projected attendance over the next 4 weeks based on {weeklyPeriods} scheduled
              classes per week.
            </p>

            {/* 4-Week Comparison Matrix & Visual Columns */}
            <div className="mt-6 grid grid-cols-5 gap-3">
              {trajectoryPoints.map((pt) => (
                <div
                  key={pt.weekLabel}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col justify-between text-center"
                >
                  <span className="text-xs font-semibold text-slate-300 border-b border-white/10 pb-2">
                    {pt.weekLabel}
                  </span>

                  <div className="my-3 space-y-2.5">
                    <div>
                      <p className="text-[10px] text-slate-400">100% Attend</p>
                      <p className="text-xs font-bold font-mono tabular-nums text-emerald-400">
                        {pt.pctPerfect.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">75% Attend</p>
                      <p className="text-xs font-bold font-mono tabular-nums text-sky-400">
                        {pt.pctModerate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">50% Attend</p>
                      <p className="text-xs font-bold font-mono tabular-nums text-rose-400">
                        {pt.pctLow.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Baseline: {baseAttended}/{baseConducted} classes
            </span>
            <span className="font-mono tabular-nums text-sky-300">
              +{weeklyPeriods * 4} classes over 4 weeks
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Chronological Attendance History Log */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </div>
            <h3 className="text-lg font-semibold text-white mt-0.5">
              Attendance Activity History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every attended, missed, or simulated update is recorded automatically
            </p>
          </div>

          {history.length > 0 && (
            <div>
              {confirmClearHistory ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-300">Clear all logs?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearHistory();
                      setConfirmClearHistory(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 text-slate-950 font-semibold text-xs"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearHistory(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearHistory(true)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            No attendance changes logged in this session yet. Mark a class attended or missed to
            populate history.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {history.map((entry) => {
              const oldPct = calculatePercentage(
                entry.previousAttended,
                entry.previousConducted
              );
              const newPct = calculatePercentage(entry.newAttended, entry.newConducted);

              return (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          entry.action === 'attended'
                            ? 'text-emerald-400'
                            : entry.action === 'missed'
                            ? 'text-rose-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {entry.action === 'attended'
                          ? 'Marked Attended'
                          : entry.action === 'missed'
                          ? 'Marked Missed'
                          : entry.action === 'simulation_applied'
                          ? 'Simulation Applied'
                          : 'Manual Update'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-white font-medium">{entry.subjectName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400 font-mono">{entry.date}</span>
                    </div>
                    {entry.note && <p className="text-xs text-slate-400 mt-0.5">{entry.note}</p>}
                  </div>

                  <div className="text-xs font-mono tabular-nums text-slate-300 shrink-0">
                    <span>
                      {entry.previousAttended}/{entry.previousConducted} ({oldPct.toFixed(1)}%)
                    </span>
                    <span className="mx-2 text-slate-500">→</span>
                    <span className="text-white font-semibold">
                      {entry.newAttended}/{entry.newConducted} ({newPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
