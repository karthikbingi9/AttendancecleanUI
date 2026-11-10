/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AppSettings,
  AttendanceLogEntry,
  DayOfWeek,
  HolidayOrCancelled,
  NavigationTab,
  Subject,
  TimetableSlot,
} from './types/attendance';
import {
  DEFAULT_SETTINGS,
  INITIAL_HISTORY,
  INITIAL_HOLIDAYS,
  INITIAL_SUBJECTS,
  INITIAL_TIMETABLE,
} from './data/sampleData';
import {
  evaluateOverallSummary,
  evaluateSubject,
  predictUpcomingSchedule,
} from './utils/attendanceMath';
import { DashboardView } from './components/DashboardView';
import { TimetableView } from './components/TimetableView';
import { SubjectsView } from './components/SubjectsView';
import { CalculatorView } from './components/CalculatorView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Calculator,
  BarChart3,
  Settings,
  Download,
} from 'lucide-react';

const STORAGE_KEYS = {
  SUBJECTS: 'lumina_attendance_subjects_v1',
  TIMETABLE: 'lumina_attendance_timetable_v1',
  HOLIDAYS: 'lumina_attendance_holidays_v1',
  HISTORY: 'lumina_attendance_history_v1',
  SETTINGS: 'lumina_attendance_settings_v1',
};

const NAV_ITEMS: Array<{
  id: NavigationTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { id: 'timetable', label: 'My Timetable', shortLabel: 'Timetable', icon: Calendar },
  { id: 'subjects', label: 'Subjects', shortLabel: 'Subjects', icon: BookOpen },
  { id: 'calculator', label: 'Attendance Calculator', shortLabel: 'Calculator', icon: Calculator },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Persistent State Hooks
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
    } catch {
      return INITIAL_SUBJECTS;
    }
  });

  const [slots, setSlots] = useState<TimetableSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
      return saved ? JSON.parse(saved) : INITIAL_TIMETABLE;
    } catch {
      return INITIAL_TIMETABLE;
    }
  });

  const [holidays, setHolidays] = useState<HolidayOrCancelled[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
      return saved ? JSON.parse(saved) : INITIAL_HOLIDAYS;
    } catch {
      return INITIAL_HOLIDAYS;
    }
  });

  const [history, setHistory] = useState<AttendanceLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch {
      // Ignore storage quota errors
    }
  }, [subjects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(slots));
    } catch {
      // Ignore storage quota errors
    }
  }, [slots]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
    } catch {
      // Ignore storage quota errors
    }
  }, [holidays]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  // Derived Real-time Calculations
  const subjectCalcs = useMemo(
    () =>
      subjects.map((s) =>
        evaluateSubject(s, settings.targetPercentage, settings.warningBufferPercentage)
      ),
    [subjects, settings.targetPercentage, settings.warningBufferPercentage]
  );

  const summary = useMemo(
    () =>
      evaluateOverallSummary(
        subjects,
        settings.targetPercentage,
        settings.warningBufferPercentage
      ),
    [subjects, settings.targetPercentage, settings.warningBufferPercentage]
  );

  const upcomingSlots = useMemo(
    () => predictUpcomingSchedule(subjects, slots, holidays, 7),
    [subjects, slots, holidays]
  );

  // Handlers
  const handleQuickMark = (subjectId: string, type: 'attended' | 'missed') => {
    const target = subjects.find((s) => s.id === subjectId);
    if (!target) return;

    const newConducted = target.conducted + 1;
    const newAttended = type === 'attended' ? target.attended + 1 : target.attended;

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, conducted: newConducted, attended: newAttended }
          : s
      )
    );

    const logEntry: AttendanceLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      subjectId: target.id,
      subjectName: target.name,
      action: type,
      previousAttended: target.attended,
      previousConducted: target.conducted,
      newAttended,
      newConducted,
      note:
        type === 'attended'
          ? `Marked +1 class attended for ${target.code}`
          : `Marked +1 class missed for ${target.code}`,
    };

    setHistory((prev) => [logEntry, ...prev]);
  };

  const handleApplySimulation = (
    subjectId: string,
    addAttended: number,
    addMissed: number
  ) => {
    const target = subjects.find((s) => s.id === subjectId);
    if (!target) return;

    const newAttended = target.attended + addAttended;
    const newConducted = target.conducted + addAttended + addMissed;

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, attended: newAttended, conducted: newConducted }
          : s
      )
    );

    const logEntry: AttendanceLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      subjectId: target.id,
      subjectName: target.name,
      action: 'simulation_applied',
      previousAttended: target.attended,
      previousConducted: target.conducted,
      newAttended,
      newConducted,
      note: `Applied simulation: +${addAttended} attended, +${addMissed} missed`,
    };

    setHistory((prev) => [logEntry, ...prev]);
  };

  const handleAddSubject = (newSubj: Omit<Subject, 'id'>) => {
    const created: Subject = {
      ...newSubj,
      id: `subj-${Date.now()}`,
    };
    setSubjects((prev) => [...prev, created]);
  };

  const handleUpdateSubject = (updated: Subject) => {
    const prevSubj = subjects.find((s) => s.id === updated.id);
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    if (
      prevSubj &&
      (prevSubj.attended !== updated.attended || prevSubj.conducted !== updated.conducted)
    ) {
      const logEntry: AttendanceLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        subjectId: updated.id,
        subjectName: updated.name,
        action: 'manual_edit',
        previousAttended: prevSubj.attended,
        previousConducted: prevSubj.conducted,
        newAttended: updated.attended,
        newConducted: updated.conducted,
        note: `Updated ${updated.code} attendance counts manually`,
      };
      setHistory((prev) => [logEntry, ...prev]);
    }
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setSlots((prev) => prev.filter((sl) => sl.subjectId !== subjectId));
  };

  const handleUpdateSubjectPeriods = (subjectId: string, periodsPerWeek: number) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, periodsPerWeek } : s))
    );
  };

  const handleAddSlot = (newSlot: Omit<TimetableSlot, 'id'>) => {
    const created: TimetableSlot = {
      ...newSlot,
      id: `slot-${Date.now()}`,
    };
    setSlots((prev) => [...prev, created]);
  };

  const handleDeleteSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const handleSyncExtractedTimetable = (
    extractedSubjects: Array<{
      name: string;
      code: string;
      periodsPerWeek: number;
      professor?: string;
    }>,
    extractedSlots: Array<{
      subjectName: string;
      subjectCode?: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      room?: string;
    }>
  ) => {
    const palette = ['#38BDF8', '#10B981', '#F59E0B', '#F43F5E', '#A855F7', '#EC4899'];
    const updatedSubjects = [...subjects];

    const findOrCreateSubjectId = (name: string, code: string, periodsPerWeek: number, professor?: string): string => {
      const existing = updatedSubjects.find(
        (s) =>
          s.name.toLowerCase() === name.toLowerCase() ||
          s.code.toLowerCase() === code.toLowerCase()
      );
      if (existing) {
        existing.periodsPerWeek = periodsPerWeek || existing.periodsPerWeek;
        return existing.id;
      }
      const newId = `subj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      updatedSubjects.push({
        id: newId,
        name,
        code: code.toUpperCase(),
        conducted: 20,
        attended: 15,
        periodsPerWeek: periodsPerWeek || 3,
        professor,
        color: palette[updatedSubjects.length % palette.length],
      });
      return newId;
    };

    for (const extSubj of extractedSubjects) {
      findOrCreateSubjectId(
        extSubj.name,
        extSubj.code,
        extSubj.periodsPerWeek,
        extSubj.professor
      );
    }

    const createdSlots: TimetableSlot[] = extractedSlots.map((sl, index) => {
      const matchedId = findOrCreateSubjectId(
        sl.subjectName,
        sl.subjectCode || sl.subjectName.slice(0, 5),
        3
      );
      return {
        id: `ext-slot-${Date.now()}-${index}`,
        subjectId: matchedId,
        dayOfWeek: sl.dayOfWeek,
        startTime: sl.startTime,
        endTime: sl.endTime,
        room: sl.room,
      };
    });

    setSubjects(updatedSubjects);
    setSlots(createdSlots);
  };

  const handleAddHoliday = (entry: Omit<HolidayOrCancelled, 'id'>) => {
    const created: HolidayOrCancelled = {
      ...entry,
      id: `hol-${Date.now()}`,
    };
    setHolidays((prev) => [created, ...prev]);
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  // Report Export Handlers
  const handleExportCsvReport = () => {
    const header = [
      'Course Code',
      'Subject Name',
      'Classes Conducted',
      'Classes Attended',
      'Classes Absent',
      'Current Attendance %',
      'Target %',
      'Standing Mode',
      'Consecutive Classes Required',
      'Max Safe Absences Allowed',
    ].join(',');

    const rows = subjectCalcs.map((c) =>
      [
        `"${c.subjectCode}"`,
        `"${c.subjectName}"`,
        c.conducted,
        c.attended,
        c.absent,
        `${c.percentage.toFixed(2)}%`,
        `${c.targetPercentage}%`,
        `"${c.goalModeLabel}"`,
        c.classesNeededToReachTarget,
        c.safeAbsencesAllowed,
      ].join(',')
    );

    const overallRow = [
      '"OVERALL"',
      '"Aggregate Standing"',
      summary.totalConducted,
      summary.totalAttended,
      summary.totalMissed,
      `${summary.overallPercentage.toFixed(2)}%`,
      `${summary.targetPercentage}%`,
      `"${summary.statusLabel}"`,
      summary.overallClassesNeeded,
      summary.overallSafeAbsences,
    ].join(',');

    const csvContent = [header, ...rows, overallRow].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      summary,
      subjects,
      slots,
      holidays,
      history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina_attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreSampleData = () => {
    setSubjects(INITIAL_SUBJECTS);
    setSlots(INITIAL_TIMETABLE);
    setHolidays(INITIAL_HOLIDAYS);
    setHistory(INITIAL_HISTORY);
    setSettings(DEFAULT_SETTINGS);
  };

  const handleClearAllWorkspaceData = () => {
    setSubjects([]);
    setSlots([]);
    setHolidays([]);
    setHistory([]);
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col lg:flex-row relative selection:bg-sky-500/30">
      {/* Ambient Deep Specular Background Illumination */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-sky-500/[0.07] blur-[130px]" />
        <div className="absolute top-1/2 -right-32 w-[460px] h-[460px] rounded-full bg-indigo-500/[0.06] blur-[140px]" />
        <div className="absolute -bottom-40 left-10 w-[420px] h-[420px] rounded-full bg-emerald-500/[0.05] blur-[130px]" />
      </div>

      {/* Desktop Sleek Liquid Glass Sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col justify-between liquid-glass border-r border-white/10 p-6 sticky top-0 h-screen z-20">
        <div className="space-y-8">
          {/* Brand Lockup */}
          <div className="px-2">
            <span className="text-xl font-bold tracking-tight text-white font-display whitespace-nowrap">
              Lumina Attendance
            </span>
            <p className="text-xs text-slate-400 mt-1 truncate">
              {settings.semesterName}
            </p>
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 font-semibold shadow-[0_0_24px_rgba(56,189,248,0.35)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Compact Standing Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Overall Standing</span>
            <span className="font-mono tabular-nums text-sky-400">
              Target {settings.targetPercentage}%
            </span>
          </div>
          <p
            className={`text-2xl font-bold font-mono tabular-nums ${
              summary.status === 'safe'
                ? 'text-emerald-400'
                : summary.status === 'warning'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {summary.overallPercentage.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400 font-mono tabular-nums">
            {summary.totalAttended} attended · {summary.totalConducted} conducted
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 pb-20 lg:pb-0">
        {/* Strict 3-Zone Top Navigation Header */}
        <header className="sticky top-0 z-30 liquid-glass border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand / Context Title */}
          <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0">
            {activeNavMeta.label}
          </span>

          {/* Zone 2: Concise Single-Line Navigation Links on Tablet/Desktop */}
          <nav className="hidden md:flex lg:hidden items-center gap-5 text-xs font-medium text-slate-300">
            {NAV_ITEMS.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id ? 'text-sky-400 underline underline-offset-4' : ''
                }`}
              >
                {item.shortLabel}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCsvReport}
              className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </header>

        {/* Active Section Viewport */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              subjects={subjects}
              subjectCalcs={subjectCalcs}
              upcomingSlots={upcomingSlots}
              onQuickMark={handleQuickMark}
              onApplySimulation={handleApplySimulation}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableView
              subjects={subjects}
              slots={slots}
              holidays={holidays}
              includeSaturday={settings.includeSaturday}
              onAddSlot={handleAddSlot}
              onDeleteSlot={handleDeleteSlot}
              onSyncExtractedTimetable={handleSyncExtractedTimetable}
              onAddHoliday={handleAddHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              onUpdateSubjectPeriods={handleUpdateSubjectPeriods}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectsView
              subjects={subjects}
              subjectCalcs={subjectCalcs}
              targetPercentage={settings.targetPercentage}
              onAddSubject={handleAddSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
              onQuickMark={handleQuickMark}
            />
          )}

          {activeTab === 'calculator' && (
            <CalculatorView
              subjects={subjects}
              subjectCalcs={subjectCalcs}
              targetPercentage={settings.targetPercentage}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              summary={summary}
              subjects={subjects}
              subjectCalcs={subjectCalcs}
              history={history}
              onClearHistory={() => setHistory([])}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              summary={summary}
              subjects={subjects}
              subjectCalcs={subjectCalcs}
              onUpdateSettings={setSettings}
              onExportCsvReport={handleExportCsvReport}
              onExportJsonBackup={handleExportJsonBackup}
              onRestoreSampleData={handleRestoreSampleData}
              onClearAllWorkspaceData={handleClearAllWorkspaceData}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Liquid Glass Navigation Bar (<= 15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 liquid-glass border-t border-white/15 px-2 py-1.5 flex items-center justify-around"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
