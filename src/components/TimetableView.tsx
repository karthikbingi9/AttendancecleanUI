import React, { useState, useRef } from 'react';
import {
  DayOfWeek,
  HolidayOrCancelled,
  Subject,
  TimetableSlot,
} from '../types/attendance';
import {
  Upload,
  Sparkles,
  FileSpreadsheet,
  Plus,
  Trash2,
  CalendarOff,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';

interface TimetableViewProps {
  subjects: Subject[];
  slots: TimetableSlot[];
  holidays: HolidayOrCancelled[];
  includeSaturday: boolean;
  onAddSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  onDeleteSlot: (slotId: string) => void;
  onSyncExtractedTimetable: (
    extractedSubjects: Array<{ name: string; code: string; periodsPerWeek: number; professor?: string }>,
    extractedSlots: Array<{
      subjectName: string;
      subjectCode?: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      room?: string;
    }>
  ) => void;
  onAddHoliday: (entry: Omit<HolidayOrCancelled, 'id'>) => void;
  onDeleteHoliday: (id: string) => void;
  onUpdateSubjectPeriods: (subjectId: string, periodsPerWeek: number) => void;
}

interface ExtractedDraftSubject {
  name: string;
  code: string;
  periodsPerWeek: number;
  professor?: string;
}

interface ExtractedDraftSlot {
  id: string;
  subjectName: string;
  subjectCode: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const TimetableView: React.FC<TimetableViewProps> = ({
  subjects,
  slots,
  holidays,
  includeSaturday,
  onAddSlot,
  onDeleteSlot,
  onSyncExtractedTimetable,
  onAddHoliday,
  onDeleteHoliday,
  onUpdateSubjectPeriods,
}) => {
  const visibleDays = includeSaturday ? DAYS_OF_WEEK : DAYS_OF_WEEK.slice(0, 5);

  // Manual Slot Form State
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [room, setRoom] = useState<string>('Hall 101');
  const [slotError, setSlotError] = useState<string | null>(null);

  // Holiday / Cancelled Form State
  const [holidayDate, setHolidayDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [holidayType, setHolidayType] = useState<'holiday' | 'cancelled'>('cancelled');
  const [holidaySubjectId, setHolidaySubjectId] = useState<string>(subjects[0]?.id || '');
  const [holidayReason, setHolidayReason] = useState<string>('');

  // Gemini AI & CSV Upload State
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftSubjects, setDraftSubjects] = useState<ExtractedDraftSubject[]>([]);
  const [draftSlots, setDraftSlots] = useState<ExtractedDraftSlot[]>([]);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const handleCreateManualSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setSlotError(null);

    if (!selectedSubjectId) {
      setSlotError('Please select a subject first.');
      return;
    }
    if (!startTime || !endTime || startTime >= endTime) {
      setSlotError('End time must be after start time.');
      return;
    }

    onAddSlot({
      subjectId: selectedSubjectId,
      dayOfWeek: selectedDay,
      startTime,
      endTime,
      room: room.trim() || undefined,
    });
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) return;

    onAddHoliday({
      date: holidayDate,
      type: holidayType,
      subjectId: holidayType === 'cancelled' ? holidaySubjectId : undefined,
      reason:
        holidayReason.trim() ||
        (holidayType === 'holiday' ? 'Academic Holiday' : 'Class Cancelled'),
    });
    setHolidayReason('');
  };

  // Convert uploaded Image/PDF to base64 and call server-side Gemini Vision route
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsExtracting(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read uploaded file.'));
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await fetch('/api/timetable/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mimeType: file.type || 'image/png',
          base64Data,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Could not extract schedule from file. Try a clearer image or CSV.'
        );
      }

      const extractedSubjs: ExtractedDraftSubject[] = (result.data?.subjects || []).map(
        (s: { name?: string; code?: string; periodsPerWeek?: number; professor?: string }) => ({
          name: s.name || 'Unnamed Course',
          code: s.code || 'COURSE',
          periodsPerWeek: Number(s.periodsPerWeek) || 3,
          professor: s.professor || '',
        })
      );

      const extractedSlotsList: ExtractedDraftSlot[] = (result.data?.slots || []).map(
        (
          sl: {
            subjectName?: string;
            subjectCode?: string;
            dayOfWeek?: string;
            startTime?: string;
            endTime?: string;
            room?: string;
          },
          idx: number
        ) => {
          const validDay = DAYS_OF_WEEK.includes(sl.dayOfWeek as DayOfWeek)
            ? (sl.dayOfWeek as DayOfWeek)
            : 'Monday';
          return {
            id: `draft-${idx}-${Date.now()}`,
            subjectName: sl.subjectName || extractedSubjs[0]?.name || 'Course',
            subjectCode: sl.subjectCode || 'CS-101',
            dayOfWeek: validDay,
            startTime: sl.startTime || '09:00',
            endTime: sl.endTime || '10:00',
            room: sl.room || 'Room 101',
          };
        }
      );

      setDraftSubjects(extractedSubjs);
      setDraftSlots(extractedSlotsList);
      setShowReviewModal(true);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to extract timetable via Gemini Vision.'
      );
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Client-side CSV Timetable Parser
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        throw new Error('CSV file must include a header row and at least one class slot row.');
      }

      const parsedSlots: ExtractedDraftSlot[] = [];
      const subjectFreqMap = new Map<string, { code: string; count: number }>();

      // Expected columns: Day,StartTime,EndTime,SubjectName,SubjectCode,Room
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length < 4) continue;
        const [rawDay, rawStart, rawEnd, rawSubjName, rawCode, rawRoom] = cols;
        const matchedDay =
          DAYS_OF_WEEK.find((d) => d.toLowerCase().startsWith(rawDay.toLowerCase().slice(0, 3))) ||
          'Monday';
        const subjName = rawSubjName || 'Imported Subject';
        const subjCode = rawCode || subjName.slice(0, 5).toUpperCase();

        parsedSlots.push({
          id: `csv-slot-${i}`,
          dayOfWeek: matchedDay,
          startTime: rawStart || '09:00',
          endTime: rawEnd || '10:00',
          subjectName: subjName,
          subjectCode: subjCode,
          room: rawRoom || '',
        });

        const existing = subjectFreqMap.get(subjName);
        subjectFreqMap.set(subjName, {
          code: subjCode,
          count: (existing?.count || 0) + 1,
        });
      }

      const parsedSubjects: ExtractedDraftSubject[] = Array.from(subjectFreqMap.entries()).map(
        ([name, info]) => ({
          name,
          code: info.code,
          periodsPerWeek: info.count,
        })
      );

      setDraftSubjects(parsedSubjects);
      setDraftSlots(parsedSlots);
      setShowReviewModal(true);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Invalid CSV format.');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = [
      'Day,StartTime,EndTime,SubjectName,SubjectCode,Room',
      'Monday,09:00,10:00,Data Structures & Algorithms,CS-301,Hall 301',
      'Monday,10:00,11:00,Operating Systems Architecture,CS-302,Lab 2B',
      'Tuesday,09:00,10:00,Computer Networks & Security,CS-304,NetLab 1',
      'Wednesday,11:00,12:00,Database Management Systems,CS-303,Hall 104',
      'Thursday,14:00,15:00,Discrete Mathematics & Logic,MA-204,Room 208',
    ].join('\n');

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_timetable_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmSync = () => {
    onSyncExtractedTimetable(draftSubjects, draftSlots);
    setShowReviewModal(false);
    setSyncSuccessMessage(
      `Synced ${draftSubjects.length} subjects and ${draftSlots.length} weekly slots into your schedule.`
    );
    setTimeout(() => setSyncSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Top Row: Gemini Vision AI & CSV Importer + Manual Slot Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Dual Gemini Vision AI + CSV Timetable Uploader */}
        <div className="lg:col-span-6 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Intelligent Schedule Extraction</span>
              </span>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Template</span>
              </button>
            </div>
            <h2 className="text-xl font-semibold text-white mt-1">
              Upload Timetable Image, PDF, or CSV
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Gemini Vision AI automatically extracts subject names, class timings, and weekly
              period frequencies. You can review and edit every row before saving.
            </p>
          </div>

          <div className="my-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Image / PDF Gemini Vision Upload Card */}
            <div className="border border-dashed border-sky-500/35 bg-sky-500/[0.04] hover:bg-sky-500/[0.08] rounded-2xl p-5 text-center transition-colors flex flex-col items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="timetable-vision-upload"
              />
              <Upload className="w-7 h-7 text-sky-400 mb-2" />
              <p className="text-sm font-semibold text-white">Image or PDF Schedule</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                PNG, JPG, WebP, or PDF parsed with Gemini Vision AI
              </p>
              <label
                htmlFor="timetable-vision-upload"
                className="cursor-pointer px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Schedule...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upload Image / PDF</span>
                  </>
                )}
              </label>
            </div>

            {/* CSV Schedule Import Card */}
            <div className="border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-5 text-center transition-colors flex flex-col items-center justify-center">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
                id="timetable-csv-upload"
              />
              <FileSpreadsheet className="w-7 h-7 text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-white">Spreadsheet CSV Import</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Instant client-side import for structured `.csv` files
              </p>
              <label
                htmlFor="timetable-csv-upload"
                className="cursor-pointer px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import CSV File</span>
              </label>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {syncSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Right 6 Cols: Manual Class Period Adder */}
        <div className="lg:col-span-6 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Manual Timetable Builder</span>
            </span>
            <h2 className="text-xl font-semibold text-white mt-1">Add Class Slot to Schedule</h2>
            <p className="text-xs text-slate-400 mt-1">
              Assign any subject to a specific weekday, time window, and classroom.
            </p>
          </div>

          <form onSubmit={handleCreateManualSlot} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Day of Week</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Room / Lab</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Hall 301"
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {slotError && <p className="text-xs text-rose-400">{slotError}</p>}

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Period to Timetable</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Weekly Timetable Grid (Monday - Saturday) */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Weekly Class Schedule Matrix</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Used to predict upcoming classes and estimate weeks required to reach target attendance
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Total Weekly Periods: {slots.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {visibleDays.map((day) => {
            const daySlots = slots
              .filter((s) => s.dayOfWeek === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={day}
                className="rounded-2xl bg-white/[0.025] border border-white/10 p-4 flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                    <h4 className="text-sm font-semibold text-white">{day}</h4>
                    <span className="text-xs font-mono tabular-nums text-slate-400">
                      {daySlots.length} {daySlots.length === 1 ? 'period' : 'periods'}
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">No classes scheduled</p>
                  ) : (
                    <div className="space-y-2.5">
                      {daySlots.map((slot) => {
                        const subj = subjectMap.get(slot.subjectId);
                        return (
                          <div
                            key={slot.id}
                            className="p-3 rounded-xl bg-slate-900/75 border border-white/10 group relative"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                              <span>
                                {slot.startTime} – {slot.endTime}
                              </span>
                              <button
                                type="button"
                                onClick={() => onDeleteSlot(slot.id)}
                                className="opacity-70 hover:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity"
                                title="Remove slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-white mt-1 line-clamp-1">
                              {subj?.name || 'Unknown Subject'}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                              <span className="font-mono text-sky-400">
                                {subj?.code || 'COURSE'}
                              </span>
                              {slot.room && <span>{slot.room}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Split: Weekly Subject Period Frequency + Holiday & Cancelled Class Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Subject Weekly Period Count Editor */}
        <div className="lg:col-span-5 liquid-glass rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Periods Per Subject Per Week
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify weekly periods for each subject to calculate exact recovery timelines
            </p>
          </div>

          <div className="space-y-2.5">
            {subjects.map((subj) => {
              const scheduledCount = slots.filter((s) => s.subjectId === subj.id).length;
              return (
                <div
                  key={subj.id}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-sky-400">{subj.code}</p>
                    <p className="text-sm font-medium text-white truncate">{subj.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {scheduledCount} slots on grid
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSubjectPeriods(subj.id, Math.max(1, subj.periodsPerWeek - 1))
                      }
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xs font-mono"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-xs font-mono tabular-nums font-semibold text-white">
                      {subj.periodsPerWeek}/wk
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSubjectPeriods(subj.id, Math.min(15, subj.periodsPerWeek + 1))
                      }
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xs font-mono"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Holidays & Cancelled Classes Manager */}
        <div className="lg:col-span-7 liquid-glass rounded-3xl p-6 space-y-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <CalendarOff className="w-3.5 h-3.5" />
              <span>Schedule Exemptions</span>
            </div>
            <h3 className="text-base font-semibold text-white mt-0.5">
              Mark Holidays &amp; Cancelled Classes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cancelled classes and holidays do not count toward total classes conducted.
            </p>
          </div>

          <form
            onSubmit={handleCreateHoliday}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white/[0.02] border border-white/10 rounded-2xl p-4"
          >
            <div className="sm:col-span-3">
              <label className="block text-[11px] text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-2 text-xs font-mono text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] text-slate-400 mb-1">Exemption Type</label>
              <select
                value={holidayType}
                onChange={(e) => setHolidayType(e.target.value as 'holiday' | 'cancelled')}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
              >
                <option value="cancelled">Cancelled Class</option>
                <option value="holiday">Full-Day Holiday</option>
              </select>
            </div>

            {holidayType === 'cancelled' && (
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
                <select
                  value={holidaySubjectId}
                  onChange={(e) => setHolidaySubjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={holidayType === 'cancelled' ? 'sm:col-span-3' : 'sm:col-span-6'}>
              <label className="block text-[11px] text-slate-400 mb-1">Reason / Note</label>
              <input
                type="text"
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                placeholder="e.g. Faculty Seminar"
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-12 flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
              >
                Mark Holiday / Cancelled
              </button>
            </div>
          </form>

          {/* List of Recorded Holidays & Cancelled Classes */}
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No holidays or cancelled classes marked yet.
              </p>
            ) : (
              holidays.map((item) => {
                const subj = item.subjectId ? subjectMap.get(item.subjectId) : null;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-amber-300">{item.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-300 font-medium">
                          {item.type === 'holiday'
                            ? 'Full-Day Holiday'
                            : `Cancelled: ${subj?.code || 'All'}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{item.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteHoliday(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                      title="Remove exemption"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Review & Correct Extracted Timetable Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="liquid-glass rounded-3xl max-w-3xl w-full p-6 sm:p-8 max-h-[88vh] flex flex-col justify-between border border-white/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs text-sky-400 font-medium">
                  Verify Extracted Timetable Data
                </span>
                <h3 className="text-xl font-semibold text-white mt-0.5">
                  Review &amp; Correct Schedule Before Saving
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 overflow-y-auto space-y-6 pr-2">
              {/* Editable Extracted Subjects */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">
                  Detected Subjects ({draftSubjects.length})
                </h4>
                <div className="space-y-2">
                  {draftSubjects.map((subj, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-white/[0.03] border border-white/10 rounded-xl p-2.5"
                    >
                      <input
                        type="text"
                        value={subj.code}
                        onChange={(e) => {
                          const next = [...draftSubjects];
                          next[idx] = { ...subj, code: e.target.value };
                          setDraftSubjects(next);
                        }}
                        className="col-span-3 bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs font-mono text-sky-300"
                        placeholder="Code"
                      />
                      <input
                        type="text"
                        value={subj.name}
                        onChange={(e) => {
                          const next = [...draftSubjects];
                          next[idx] = { ...subj, name: e.target.value };
                          setDraftSubjects(next);
                        }}
                        className="col-span-6 bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                        placeholder="Subject Name"
                      />
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={15}
                          value={subj.periodsPerWeek}
                          onChange={(e) => {
                            const next = [...draftSubjects];
                            next[idx] = {
                              ...subj,
                              periodsPerWeek: Math.max(1, Number(e.target.value)),
                            };
                            setDraftSubjects(next);
                          }}
                          className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs font-mono text-white text-center"
                        />
                        <span className="text-[10px] text-slate-400">/wk</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftSubjects(draftSubjects.filter((_, i) => i !== idx))
                        }
                        className="col-span-1 text-slate-400 hover:text-rose-400 flex justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Extracted Class Slots */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">
                  Detected Weekly Class Slots ({draftSlots.length})
                </h4>
                <div className="space-y-2">
                  {draftSlots.map((slot, idx) => (
                    <div
                      key={slot.id}
                      className="grid grid-cols-12 gap-2 items-center bg-white/[0.03] border border-white/10 rounded-xl p-2.5"
                    >
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => {
                          const next = [...draftSlots];
                          next[idx] = { ...slot, dayOfWeek: e.target.value as DayOfWeek };
                          setDraftSlots(next);
                        }}
                        className="col-span-3 bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={slot.subjectName}
                        onChange={(e) => {
                          const next = [...draftSlots];
                          next[idx] = { ...slot, subjectName: e.target.value };
                          setDraftSlots(next);
                        }}
                        className="col-span-4 bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => {
                          const next = [...draftSlots];
                          next[idx] = { ...slot, startTime: e.target.value };
                          setDraftSlots(next);
                        }}
                        className="col-span-2 bg-slate-900 border border-white/15 rounded-lg px-1.5 py-1.5 text-xs font-mono text-white"
                      />
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => {
                          const next = [...draftSlots];
                          next[idx] = { ...slot, endTime: e.target.value };
                          setDraftSlots(next);
                        }}
                        className="col-span-2 bg-slate-900 border border-white/15 rounded-lg px-1.5 py-1.5 text-xs font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setDraftSlots(draftSlots.filter((_, i) => i !== idx))}
                        className="col-span-1 text-slate-400 hover:text-rose-400 flex justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSync}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Sync Timetable</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
