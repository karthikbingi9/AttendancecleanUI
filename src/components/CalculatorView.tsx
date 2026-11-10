import React, { useState } from 'react';
import { Subject, SubjectCalculation } from '../types/attendance';
import {
  calculatePercentage,
  calculateRequiredConsecutiveClasses,
  calculateSafeAbsencesAllowed,
  simulateAttendanceScenario,
} from '../utils/attendanceMath';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface CalculatorViewProps {
  subjects: Subject[];
  subjectCalcs: SubjectCalculation[];
  targetPercentage: number;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  subjects,
  subjectCalcs,
  targetPercentage,
}) => {
  // Custom Standalone Calculator Inputs
  const [customConducted, setCustomConducted] = useState<number>(40);
  const [customAttended, setCustomAttended] = useState<number>(27);
  const [customTarget, setCustomTarget] = useState<number>(targetPercentage);
  const [futureAttend, setFutureAttend] = useState<number>(0);
  const [futureMiss, setFutureMiss] = useState<number>(0);

  const safeAttended = Math.min(customConducted, Math.max(0, customAttended));
  const safeConducted = Math.max(0, customConducted);

  const currentPct = calculatePercentage(safeAttended, safeConducted);
  const requiredConsecutive = calculateRequiredConsecutiveClasses(
    safeAttended,
    safeConducted,
    customTarget
  );
  const safeBunks = calculateSafeAbsencesAllowed(safeAttended, safeConducted, customTarget);

  const simOutcome = simulateAttendanceScenario(
    safeAttended,
    safeConducted,
    futureAttend,
    futureMiss,
    customTarget
  );

  const loadSubjectIntoSandbox = (subj: Subject) => {
    setCustomConducted(subj.conducted);
    setCustomAttended(subj.attended);
    setFutureAttend(0);
    setFutureMiss(0);
  };

  const tDecimal = (customTarget / 100).toFixed(2);
  const oneMinusTDecimal = (1 - customTarget / 100).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Top Interactive Mathematical Sandbox + Exact Formula Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Interactive Attendance & Bunk Calculator */}
        <div className="lg:col-span-7 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Precision Attendance Engine</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white mt-0.5">
                  Interactive Attendance &amp; Margin Calculator
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCustomConducted(40);
                  setCustomAttended(27);
                  setCustomTarget(targetPercentage);
                  setFutureAttend(0);
                  setFutureMiss(0);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Quick Load from Existing Subject Buttons */}
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2">Load values from your subjects:</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSubjectIntoSandbox(s)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-200 transition-colors whitespace-nowrap"
                  >
                    {s.code} ({s.attended}/{s.conducted})
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Core Numeric Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                <label className="block text-xs text-slate-400 mb-1.5">
                  Total Classes Conducted
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={customConducted}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    setCustomConducted(val);
                    if (customAttended > val) setCustomAttended(val);
                  }}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-lg font-bold font-mono tabular-nums text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                <label className="block text-xs text-slate-400 mb-1.5">
                  Total Classes Attended
                </label>
                <input
                  type="number"
                  min={0}
                  max={customConducted}
                  value={customAttended}
                  onChange={(e) =>
                    setCustomAttended(
                      Math.min(customConducted, Math.max(0, Number(e.target.value)))
                    )
                  }
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-lg font-bold font-mono tabular-nums text-emerald-400 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                <label className="block text-xs text-slate-400 mb-1.5">
                  Target Threshold (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={99}
                  value={customTarget}
                  onChange={(e) =>
                    setCustomTarget(Math.min(99, Math.max(50, Number(e.target.value))))
                  }
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-lg font-bold font-mono tabular-nums text-sky-400 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Future What-If Sliders inside Calculator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/10">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-300">If I attend next:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{futureAttend} classes
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={futureAttend}
                  onChange={(e) => setFutureAttend(Number(e.target.value))}
                  className="w-full glass-slider glass-slider-emerald"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/10">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-300">If I miss next:</span>
                  <span className="font-mono font-bold text-rose-400">
                    +{futureMiss} classes
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={futureMiss}
                  onChange={(e) => setFutureMiss(Number(e.target.value))}
                  className="w-full glass-slider glass-slider-rose"
                />
              </div>
            </div>
          </div>

          {/* Instant Output Banner */}
          <div className="p-5 rounded-2xl bg-slate-950/75 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400">Current Attendance</span>
              <p
                className={`text-3xl font-bold font-mono tabular-nums mt-0.5 ${
                  currentPct >= customTarget ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentPct.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                {safeAttended} attended · {safeConducted - safeAttended} absent
              </p>
            </div>

            <ArrowRight className="w-5 h-5 text-slate-500 hidden sm:block" />

            <div>
              <span className="text-xs text-slate-400">
                After +{futureAttend} Attend / +{futureMiss} Miss
              </span>
              <p
                className={`text-3xl font-bold font-mono tabular-nums mt-0.5 ${
                  simOutcome.projectedPercentage >= customTarget
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {simOutcome.projectedPercentage.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                New Ratio: {simOutcome.projectedAttended} / {simOutcome.projectedConducted}
              </p>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Step-by-Step Mathematical Proof & State Classification */}
        <div className="lg:col-span-5 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <span className="text-xs text-sky-400 font-medium">Mathematical Proof</span>
              <h3 className="text-xl font-semibold text-white mt-0.5">
                Exact Formula Breakdown
              </h3>
            </div>

            {/* Distinct Mode Banner: Reaching vs Maintaining vs Recovering */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-xs text-slate-400">Attendance Mode Classification</p>
              {currentPct < customTarget ? (
                <div className="mt-1">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Recovering from Below {customTarget}%</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Every class you attend increases both your attended count (+1) and total
                    conducted count (+1). You must attend{' '}
                    <strong className="font-mono text-white">{requiredConsecutive}</strong>{' '}
                    consecutive classes without a single absence.
                  </p>
                </div>
              ) : safeBunks === 0 ? (
                <div className="mt-1">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reaching / Holding {customTarget}% Threshold</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    You have reached {customTarget}%, but your safe absence margin is{' '}
                    <strong className="font-mono text-white">0 classes</strong>. Missing the very
                    next class will drop your attendance below {customTarget}%.
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Maintaining ≥{customTarget}% with Buffer</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    You can safely miss up to{' '}
                    <strong className="font-mono text-white">{safeBunks}</strong> upcoming classes
                    and still remain at or above {customTarget}%.
                  </p>
                </div>
              )}
            </div>

            {/* Formula 1: Percentage */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 font-mono text-xs space-y-1.5">
              <p className="text-slate-400 font-sans">1. Current Percentage Formula</p>
              <p className="text-slate-200">
                % = (Attended / Conducted) × 100
              </p>
              <p className="text-sky-400">
                % = ({safeAttended} / {safeConducted}) × 100 = {currentPct.toFixed(2)}%
              </p>
            </div>

            {/* Formula 2: Consecutive Classes Needed */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 font-mono text-xs space-y-1.5">
              <p className="text-slate-400 font-sans">
                2. Consecutive Classes Required for {customTarget}%
              </p>
              <p className="text-slate-200">
                Required = Ceiling(({tDecimal} × Total - Attended) / {oneMinusTDecimal})
              </p>
              <p className="text-rose-300">
                Required = Ceiling(({tDecimal} × {safeConducted} - {safeAttended}) /{' '}
                {oneMinusTDecimal}) = {requiredConsecutive} classes
              </p>
            </div>

            {/* Formula 3: Safe Absences */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 font-mono text-xs space-y-1.5">
              <p className="text-slate-400 font-sans">
                3. Maximum Additional Absences Allowed
              </p>
              <p className="text-slate-200">
                Safe Misses = Floor((Attended - {tDecimal} × Total) / {tDecimal})
              </p>
              <p className="text-emerald-300">
                Safe Misses = Floor(({safeAttended} - {tDecimal} × {safeConducted}) /{' '}
                {tDecimal}) = {safeBunks} classes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Subject-Wise Calculation Table */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">
            Complete Subject-Wise Calculation Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distinguishing Reaching {targetPercentage}%, Maintaining ≥{targetPercentage}%, and
            Recovering from &lt;{targetPercentage}% across all enrolled courses
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-3 px-4 font-medium">Subject</th>
                <th className="py-3 px-3 font-medium text-right">Conducted</th>
                <th className="py-3 px-3 font-medium text-right">Attended</th>
                <th className="py-3 px-3 font-medium text-right">Absent</th>
                <th className="py-3 px-3 font-medium text-right">Current %</th>
                <th className="py-3 px-4 font-medium">Standing Mode</th>
                <th className="py-3 px-3 font-medium text-right">
                  Needed for {targetPercentage}%
                </th>
                <th className="py-3 px-3 font-medium text-right">Max Safe Misses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {subjectCalcs.map((c) => (
                <tr key={c.subjectId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-white">{c.subjectName}</p>
                    <p className="text-[11px] font-mono text-sky-400">{c.subjectCode}</p>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-200">
                    {c.conducted}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-emerald-400">
                    {c.attended}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-rose-400">
                    {c.absent}
                  </td>
                  <td
                    className={`py-3.5 px-3 text-right font-mono tabular-nums font-bold ${
                      c.status === 'safe'
                        ? 'text-emerald-400'
                        : c.status === 'warning'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {c.percentage.toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{c.goalModeLabel}</td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                    {c.classesNeededToReachTarget > 0 ? (
                      <span className="text-rose-400 font-bold">
                        +{c.classesNeededToReachTarget} classes
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                    {c.safeAbsencesAllowed > 0 ? (
                      <span className="text-emerald-400 font-bold">
                        {c.safeAbsencesAllowed} classes
                      </span>
                    ) : (
                      <span className="text-amber-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
