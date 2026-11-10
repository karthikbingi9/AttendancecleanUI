import React, { useState } from 'react';
import {
  AppSettings,
  OverallSummary,
  Subject,
  SubjectCalculation,
} from '../types/attendance';
import {
  Settings,
  Download,
  RotateCcw,
  Trash2,
  Check,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  summary: OverallSummary;
  subjects: Subject[];
  subjectCalcs: SubjectCalculation[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onExportCsvReport: () => void;
  onExportJsonBackup: () => void;
  onRestoreSampleData: () => void;
  onClearAllWorkspaceData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  summary,
  subjectCalcs,
  onUpdateSettings,
  onExportCsvReport,
  onExportJsonBackup,
  onRestoreSampleData,
  onClearAllWorkspaceData,
}) => {
  const [studentName, setStudentName] = useState<string>(settings.studentName);
  const [semesterName, setSemesterName] = useState<string>(settings.semesterName);
  const [targetPct, setTargetPct] = useState<number>(settings.targetPercentage);
  const [warningBuffer, setWarningBuffer] = useState<number>(settings.warningBufferPercentage);
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(settings.includeSaturday);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const [confirmResetSample, setConfirmResetSample] = useState<boolean>(false);
  const [confirmWipeAll, setConfirmWipeAll] = useState<boolean>(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      studentName: studentName.trim() || 'Student',
      semesterName: semesterName.trim() || 'Current Semester',
      targetPercentage: Math.min(99, Math.max(50, Number(targetPct))),
      warningBufferPercentage: Math.min(15, Math.max(1, Number(warningBuffer))),
      includeSaturday,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Attendance Threshold & Academic Profile Settings */}
        <div className="lg:col-span-7 liquid-glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
            <Settings className="w-3.5 h-3.5" />
            <span>Calculation Parameters</span>
          </div>
          <h2 className="text-xl font-semibold text-white mt-0.5">
            Attendance Target &amp; Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Customize your institutional attendance threshold (75% default) and schedule days.
          </p>

          <form onSubmit={handleSavePreferences} className="space-y-5 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Academic Term / Program
                </label>
                <input
                  type="text"
                  value={semesterName}
                  onChange={(e) => setSemesterName(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Custom Attendance Target Percentage Slider */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-white">
                    Minimum Required Attendance Target
                  </label>
                  <p className="text-[11px] text-slate-400">
                    All consecutive recovery and safe absence formulas recalculate immediately
                  </p>
                </div>
                <span className="text-xl font-bold font-mono tabular-nums text-sky-400">
                  {targetPct}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                step={1}
                value={targetPct}
                onChange={(e) => setTargetPct(Number(e.target.value))}
                className="w-full glass-slider"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>50%</span>
                <button
                  type="button"
                  onClick={() => setTargetPct(75)}
                  className="text-sky-400 hover:underline"
                >
                  Reset to 75% Standard
                </button>
                <span>95%</span>
              </div>
            </div>

            {/* Warning Buffer Slider */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-white">
                    Yellow Warning Buffer Above Target
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Marks subjects within +{warningBuffer}% of {targetPct}% as &ldquo;Close to Target&rdquo;
                  </p>
                </div>
                <span className="text-base font-bold font-mono tabular-nums text-amber-400">
                  +{warningBuffer}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={warningBuffer}
                onChange={(e) => setWarningBuffer(Number(e.target.value))}
                className="w-full glass-slider"
              />
            </div>

            {/* Saturday Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div>
                <p className="text-xs font-semibold text-white">Include Saturday in Timetable</p>
                <p className="text-[11px] text-slate-400">
                  Enable 6-day academic week (Monday–Saturday)
                </p>
              </div>
              <input
                type="checkbox"
                checked={includeSaturday}
                onChange={(e) => setIncludeSaturday(e.target.checked)}
                className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              {savedNotice ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Preferences saved and attendance recalculated</span>
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* Right 5 Cols: Export Reports & Workspace Data Management */}
        <div className="lg:col-span-5 space-y-6">
          {/* Export Reports Card */}
          <div className="liquid-glass rounded-3xl p-6 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <FileText className="w-3.5 h-3.5" />
                <span>Attendance Reports &amp; Backups</span>
              </div>
              <h3 className="text-lg font-semibold text-white mt-0.5">
                Export Attendance Summary
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Download your subject-wise attendance ledger, required classes, and safe absence margins.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-xs space-y-1.5 font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Overall Standing:</span>
                <span className="text-white font-bold">
                  {summary.overallPercentage.toFixed(2)}% ({summary.totalAttended}/
                  {summary.totalConducted})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subjects Tracked:</span>
                <span className="text-white">{subjectCalcs.length} courses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Threshold:</span>
                <span className="text-sky-400">{settings.targetPercentage}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onExportCsvReport}
                className="py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV Report</span>
              </button>

              <button
                type="button"
                onClick={onExportJsonBackup}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>
            </div>
          </div>

          {/* Data Persistence & Reset Controls */}
          <div className="liquid-glass rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Local Data Management</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your attendance data is saved automatically in your browser. Use the controls below
                to reload sample data or start with a blank workspace.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {confirmResetSample ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                  <span className="text-xs text-amber-200">
                    Replace current workspace with default sample dataset?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreSampleData();
                        setConfirmResetSample(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetSample(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetSample(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>Restore Sample Semester Data</span>
                </button>
              )}

              {confirmWipeAll ? (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2">
                  <span className="text-xs text-rose-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Delete all subjects, slots, and logs?</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllWorkspaceData();
                        setConfirmWipeAll(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500 text-slate-950 font-semibold text-xs"
                    >
                      Wipe All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmWipeAll(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmWipeAll(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All Attendance Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
