import React, { useState } from 'react';
import {
  OverallSummary,
  Subject,
  SubjectCalculation,
  NavigationTab,
} from '../types/attendance';
import {
  simulateAttendanceScenario,
  UpcomingPredictedSlot,
} from '../utils/attendanceMath';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  Plus,
  Minus,
  RotateCcw,
  ArrowRight,
  Calendar,
  BookOpen,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

interface DashboardViewProps {
  summary: OverallSummary;
  subjects: Subject[];
  subjectCalcs: SubjectCalculation[];
  upcomingSlots: UpcomingPredictedSlot[];
  onQuickMark: (subjectId: string, type: 'attended' | 'missed') => void;
  onApplySimulation: (subjectId: string, addAttended: number, addMissed: number) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  subjects,
  subjectCalcs,
  upcomingSlots,
  onQuickMark,
  onApplySimulation,
  onNavigate,
}) => {
  // Live What-If Bunk & Catch-Up Simulator State
  const [simTargetId, setSimTargetId] = useState<string>('ALL');
  const [simAttendCount, setSimAttendCount] = useState<number>(0);
  const [simMissCount, setSimMissCount] = useState<number>(0);
  const [simAppliedFeedback, setSimAppliedFeedback] = useState<string | null>(null);

  // Filter state for subject overview table
  const [statusFilter, setStatusFilter] = useState<'all' | 'danger' | 'warning' | 'safe'>('all');

  const selectedSimSubject =
    simTargetId === 'ALL' ? null : subjects.find((s) => s.id === simTargetId) || null;

  const baseAttended = selectedSimSubject ? selectedSimSubject.attended : summary.totalAttended;
  const baseConducted = selectedSimSubject ? selectedSimSubject.conducted : summary.totalConducted;

  const simResult = simulateAttendanceScenario(
    baseAttended,
    baseConducted,
    simAttendCount,
    simMissCount,
    summary.targetPercentage
  );

  const handleApplySimToSubject = () => {
    if (!selectedSimSubject || (simAttendCount === 0 && simMissCount === 0)) return;
    onApplySimulation(selectedSimSubject.id, simAttendCount, simMissCount);
    setSimAttendCount(0);
    setSimMissCount(0);
    setSimAppliedFeedback(`Applied +${simAttendCount} attended, +${simMissCount} missed to ${selectedSimSubject.code}`);
    setTimeout(() => setSimAppliedFeedback(null), 3500);
  };

  // SVG Ring Math
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, summary.overallPercentage));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  const ringStrokeColor =
    summary.status === 'safe'
      ? '#10B981'
      : summary.status === 'warning'
      ? '#F59E0B'
      : '#F43F5E';

  const filteredCalcs = subjectCalcs.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-8">
      {/* Primary Hero Split: Overall Attendance Gauge + 3 Core Questions Answered */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 5 Cols: Overall Attendance Ring & Primary Answer Card */}
        <div className="lg:col-span-5 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: ringStrokeColor }}
          />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">Overall Academic Standing</p>
              <h2 className="text-xl sm:text-2xl font-semibold text-white mt-0.5">
                Aggregate Attendance
              </h2>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  summary.status === 'safe'
                    ? 'text-emerald-400'
                    : summary.status === 'warning'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {summary.status === 'safe' && <CheckCircle2 className="w-4 h-4" />}
                {summary.status === 'warning' && <AlertTriangle className="w-4 h-4" />}
                {summary.status === 'danger' && <ShieldAlert className="w-4 h-4" />}
                <span>{summary.statusLabel}</span>
              </span>
            </div>
          </div>

          {/* Radial SVG Gauge */}
          <div className="my-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="12"
                />
                {/* Target Threshold Tick Marker */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={ringStrokeColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-white tracking-tight">
                  {summary.overallPercentage.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  Target · {summary.targetPercentage}%
                </span>
              </div>
            </div>

            {/* The Three Primary Student Questions Answered Immediately */}
            <div className="flex-1 space-y-4 w-full">
              <div className="border-b border-white/10 pb-3">
                <p className="text-xs text-slate-400">1. Current Ratio</p>
                <p className="text-lg font-semibold font-mono tabular-nums text-white mt-0.5">
                  {summary.totalAttended} <span className="text-slate-400 font-normal">of</span>{' '}
                  {summary.totalConducted} classes
                </p>
              </div>

              <div className="border-b border-white/10 pb-3">
                <p className="text-xs text-slate-400">
                  2. Consecutive to Reach {summary.targetPercentage}%
                </p>
                {summary.overallClassesNeeded > 0 ? (
                  <p className="text-lg font-semibold font-mono tabular-nums text-rose-400 mt-0.5">
                    Attend next {summary.overallClassesNeeded} classes
                  </p>
                ) : (
                  <p className="text-sm font-medium text-emerald-400 mt-0.5">
                    On track · {summary.totalSubjectConsecutiveRequired > 0
                      ? `${summary.totalSubjectConsecutiveRequired} needed in specific subjects`
                      : 'All thresholds met'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  3. Safe Absences Above {summary.targetPercentage}%
                </p>
                {summary.overallSafeAbsences > 0 ? (
                  <p className="text-lg font-semibold font-mono tabular-nums text-emerald-400 mt-0.5">
                    Can miss up to {summary.overallSafeAbsences} classes
                  </p>
                ) : (
                  <p className="text-sm font-medium text-amber-400 mt-0.5">
                    0 safe misses · Do not skip next class
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Overall Progress Bar with Target Marker */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>0%</span>
              <span className="text-sky-300 font-mono tabular-nums">
                Mandatory Threshold: {summary.targetPercentage}%
              </span>
              <span>100%</span>
            </div>
            <div className="relative h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${clampedPct}%`,
                  backgroundColor: ringStrokeColor,
                }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#fff]"
                style={{ left: `${summary.targetPercentage}%` }}
                title={`Target ${summary.targetPercentage}%`}
              />
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Live What-If Bunk & Catch-Up Simulator */}
        <div className="lg:col-span-7 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-sky-500/15 blur-3xl" />

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Interactive Projection Engine</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white mt-0.5">
                  Live What-If Bunk &amp; Catch-Up Simulator
                </h2>
              </div>

              {/* Subject Scope Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="sim-scope" className="text-xs text-slate-400 whitespace-nowrap">
                  Simulate for:
                </label>
                <select
                  id="sim-scope"
                  value={simTargetId}
                  onChange={(e) => {
                    setSimTargetId(e.target.value);
                    setSimAttendCount(0);
                    setSimMissCount(0);
                  }}
                  className="bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="ALL">All Subjects (Overall)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dual Interactive Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
              {/* Slider 1: Consecutive Classes to Attend */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-300">
                    Hypothetical Classes Attended
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                    +{simAttendCount} classes
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={simAttendCount}
                  onChange={(e) => setSimAttendCount(Number(e.target.value))}
                  className="w-full glass-slider glass-slider-emerald"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-slate-400 font-mono">0</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSimAttendCount(Math.max(0, simAttendCount - 1))}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                      aria-label="Decrease simulated attended classes"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimAttendCount(Math.min(30, simAttendCount + 1))}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                      aria-label="Increase simulated attended classes"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">+30</span>
                </div>
              </div>

              {/* Slider 2: Future Classes to Miss (Bunk) */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-300">
                    Hypothetical Classes Missed (Bunk)
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-rose-400">
                    +{simMissCount} classes
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={simMissCount}
                  onChange={(e) => setSimMissCount(Number(e.target.value))}
                  className="w-full glass-slider glass-slider-rose"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-slate-400 font-mono">0</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSimMissCount(Math.max(0, simMissCount - 1))}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                      aria-label="Decrease simulated missed classes"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimMissCount(Math.min(20, simMissCount + 1))}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                      aria-label="Increase simulated missed classes"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">+20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Simulated Result Strip */}
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-400">Projected Attendance</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span
                    className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                      simResult.status === 'safe'
                        ? 'text-emerald-400'
                        : simResult.status === 'warning'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {simResult.projectedPercentage.toFixed(2)}%
                  </span>
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      simResult.percentageDelta > 0
                        ? 'text-emerald-400'
                        : simResult.percentageDelta < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    ({simResult.percentageDelta >= 0 ? '+' : ''}
                    {simResult.percentageDelta.toFixed(2)}%)
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                  Ratio: {simResult.projectedAttended} / {simResult.projectedConducted} classes
                </p>
              </div>

              <div className="h-10 w-px bg-white/10 hidden sm:block" />

              <div>
                <p className="text-xs text-slate-400">Post-Simulation Standing</p>
                {simResult.remainingNeededAfterSim > 0 ? (
                  <p className="text-sm font-medium text-rose-300 mt-1">
                    Still needs{' '}
                    <span className="font-mono font-bold tabular-nums">
                      {simResult.remainingNeededAfterSim}
                    </span>{' '}
                    consecutive classes for {summary.targetPercentage}%
                  </p>
                ) : (
                  <p className="text-sm font-medium text-emerald-300 mt-1">
                    Safe buffer:{' '}
                    <span className="font-mono font-bold tabular-nums">
                      {simResult.remainingSafeBunksAfterSim}
                    </span>{' '}
                    additional absences allowed
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(simAttendCount > 0 || simMissCount > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSimAttendCount(0);
                    setSimMissCount(0);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
              {selectedSimSubject && (simAttendCount > 0 || simMissCount > 0) && (
                <button
                  type="button"
                  onClick={handleApplySimToSubject}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
                >
                  Commit to {selectedSimSubject.code}
                </button>
              )}
            </div>
          </div>

          {simAppliedFeedback && (
            <p className="text-xs text-emerald-400 mt-2 font-medium">{simAppliedFeedback}</p>
          )}
        </div>
      </div>

      {/* 8-Metric Comprehensive KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Total Subjects</p>
          <p className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {summary.totalSubjects}
          </p>
        </div>
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Conducted</p>
          <p className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {summary.totalConducted}
          </p>
        </div>
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Attended</p>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {summary.totalAttended}
          </p>
        </div>
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Missed</p>
          <p className="text-xl font-bold font-mono tabular-nums text-rose-400 mt-1">
            {summary.totalMissed}
          </p>
        </div>
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Above {summary.targetPercentage}%</p>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {summary.subjectsSafelyAboveTarget}
          </p>
        </div>
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Borderline</p>
          <p className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
            {summary.subjectsCloseToTarget}
          </p>
        </div>
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Below {summary.targetPercentage}%</p>
          <p className="text-xl font-bold font-mono tabular-nums text-rose-400 mt-1">
            {summary.subjectsBelowTarget}
          </p>
        </div>
        <div className="liquid-glass-subtle rounded-2xl p-4">
          <p className="text-xs text-slate-400">Classes Needed</p>
          <p className="text-xl font-bold font-mono tabular-nums text-sky-400 mt-1">
            {summary.totalSubjectConsecutiveRequired}
          </p>
        </div>
      </div>

      {/* Main Content Split: Subject Status Breakdown & Upcoming Schedule Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Subject Attendance Action Matrix */}
        <div className="lg:col-span-8 liquid-glass rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Subject-Wise Attendance &amp; Recovery Status
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant one-tap class logging and exact recovery/buffer calculations
              </p>
            </div>

            {/* Interactive Segmented Filter Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-white/10 rounded-xl self-start">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'danger', label: `Below ${summary.targetPercentage}%` },
                  { id: 'warning', label: 'Borderline' },
                  { id: 'safe', label: 'Safe' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredCalcs.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl">
              <BookOpen className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">
                No subjects match the selected status filter.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors"
              >
                Show All Subjects
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCalcs.map((calc) => {
                const barColor =
                  calc.status === 'safe'
                    ? '#10B981'
                    : calc.status === 'warning'
                    ? '#F59E0B'
                    : '#F43F5E';

                return (
                  <div
                    key={calc.subjectId}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono text-sky-400 font-medium">
                            {calc.subjectCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{calc.goalModeLabel}</span>
                          {calc.estimatedWeeksToRecover !== null && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-rose-300">
                                ~{calc.estimatedWeeksToRecover} wks to recover
                              </span>
                            </>
                          )}
                        </div>
                        <h4 className="text-base font-semibold text-white">{calc.subjectName}</h4>
                      </div>

                      {/* Quick Attendance Action Buttons + Percentage */}
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onQuickMark(calc.subjectId, 'attended')}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                            title="Mark 1 class attended"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Attend</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickMark(calc.subjectId, 'missed')}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                            title="Mark 1 class missed"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Miss</span>
                          </button>
                        </div>

                        <div className="text-right min-w-[78px]">
                          <span
                            className={`text-xl font-bold font-mono tabular-nums ${
                              calc.status === 'safe'
                                ? 'text-emerald-400'
                                : calc.status === 'warning'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {calc.percentage.toFixed(1)}%
                          </span>
                          <p className="text-[11px] font-mono tabular-nums text-slate-400">
                            {calc.attended}/{calc.conducted} ({calc.absent} missed)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar + Status requirement line */}
                    <div className="mt-3">
                      <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, calc.percentage)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
                          style={{ left: `${calc.targetPercentage}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs">
                        {calc.classesNeededToReachTarget > 0 ? (
                          <span className="text-rose-300 font-medium">
                            Attend next{' '}
                            <strong className="font-mono tabular-nums text-white">
                              {calc.classesNeededToReachTarget}
                            </strong>{' '}
                            consecutive classes to reach {calc.targetPercentage}%
                          </span>
                        ) : calc.safeAbsencesAllowed > 0 ? (
                          <span className="text-emerald-300 font-medium">
                            Can safely miss{' '}
                            <strong className="font-mono tabular-nums text-white">
                              {calc.safeAbsencesAllowed}
                            </strong>{' '}
                            upcoming {calc.safeAbsencesAllowed === 1 ? 'class' : 'classes'}
                          </span>
                        ) : (
                          <span className="text-amber-300 font-medium">
                            At exact {calc.targetPercentage}% threshold · Next absence drops to{' '}
                            <strong className="font-mono tabular-nums">
                              {calc.nextIfMissPercentage.toFixed(1)}%
                            </strong>
                          </span>
                        )}

                        <span className="text-slate-400 font-mono tabular-nums">
                          Next class: Attend → {calc.nextIfAttendPercentage.toFixed(1)}% · Miss →{' '}
                          {calc.nextIfMissPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Schedule-Aware Upcoming Classes & Projections */}
        <div className="lg:col-span-4 liquid-glass rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Upcoming Class Impact</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Live timetable predictions &amp; holiday exemptions
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 whitespace-nowrap"
            >
              <span>Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingSlots.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl px-4">
              <Calendar className="w-7 h-7 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300">No upcoming classes scheduled.</p>
              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 text-xs font-medium"
              >
                Configure Timetable
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {upcomingSlots.slice(0, 8).map((slot) => (
                <div
                  key={`${slot.dateStr}-${slot.slotId}`}
                  className={`p-3.5 rounded-2xl border transition-colors ${
                    slot.isHolidayOrCancelled
                      ? 'bg-amber-500/[0.04] border-amber-500/25'
                      : 'bg-white/[0.025] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{slot.displayDate}</span>
                    <span className="font-mono tabular-nums">
                      {slot.startTime} – {slot.endTime}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">
                      {slot.subjectName}
                    </p>
                    <span className="text-xs font-mono text-sky-400 shrink-0">
                      {slot.subjectCode}
                    </span>
                  </div>

                  {slot.isHolidayOrCancelled ? (
                    <p className="mt-2 text-xs text-amber-300">
                      Exempt · {slot.exemptionReason || 'Holiday / Cancelled Class'}
                    </p>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-emerald-400">
                        If Attend: {slot.ifAttendPct.toFixed(1)}%
                      </span>
                      <span className="text-rose-400">
                        If Miss: {slot.ifMissPct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick AI Timetable Upload CTA */}
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini Vision Timetable Sync</span>
              </div>
              <p className="text-xs text-slate-300">
                Upload a timetable image, PDF, or CSV to auto-populate schedules.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
