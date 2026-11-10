import React, { useState } from 'react';
import { Subject, SubjectCalculation } from '../types/attendance';
import {
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  BookOpen,
  AlertTriangle,
  Search,
} from 'lucide-react';

interface SubjectsViewProps {
  subjects: Subject[];
  subjectCalcs: SubjectCalculation[];
  targetPercentage: number;
  onAddSubject: (subj: Omit<Subject, 'id'>) => void;
  onUpdateSubject: (subj: Subject) => void;
  onDeleteSubject: (id: string) => void;
  onQuickMark: (subjectId: string, type: 'attended' | 'missed') => void;
}

const ACCENT_PALETTE = [
  '#38BDF8',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#A855F7',
  '#EC4899',
  '#06B6D4',
  '#6366F1',
];

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  subjectCalcs,
  targetPercentage,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onQuickMark,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [conducted, setConducted] = useState<number>(20);
  const [attended, setAttended] = useState<number>(16);
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(3);
  const [professor, setProfessor] = useState<string>('');
  const [color, setColor] = useState<string>(ACCENT_PALETTE[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setConducted(20);
    setAttended(15);
    setPeriodsPerWeek(3);
    setProfessor('');
    setColor(ACCENT_PALETTE[subjects.length % ACCENT_PALETTE.length]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subj: Subject) => {
    setEditingSubject(subj);
    setName(subj.name);
    setCode(subj.code);
    setConducted(subj.conducted);
    setAttended(subj.attended);
    setPeriodsPerWeek(subj.periodsPerWeek);
    setProfessor(subj.professor || '');
    setColor(subj.color);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !code.trim()) {
      setFormError('Subject name and course code are required.');
      return;
    }
    if (conducted < 0 || attended < 0) {
      setFormError('Classes conducted and attended cannot be negative.');
      return;
    }
    if (attended > conducted) {
      setFormError('Classes attended cannot exceed total classes conducted.');
      return;
    }

    if (editingSubject) {
      onUpdateSubject({
        ...editingSubject,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        conducted: Number(conducted),
        attended: Number(attended),
        periodsPerWeek: Math.max(1, Number(periodsPerWeek)),
        professor: professor.trim() || undefined,
        color,
      });
    } else {
      onAddSubject({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        conducted: Number(conducted),
        attended: Number(attended),
        periodsPerWeek: Math.max(1, Number(periodsPerWeek)),
        professor: professor.trim() || undefined,
        color,
      });
    }

    setIsModalOpen(false);
  };

  const calcMap = new Map(subjectCalcs.map((c) => [c.subjectId, c]));

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.professor || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="liquid-glass rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Subject Attendance Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track individual course attendance, update class counts, and inspect exact {targetPercentage}% margins
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject or code..."
              className="bg-slate-900/90 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 w-56"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Subject</span>
          </button>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No subjects found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Add your semester courses to begin calculating consecutive classes required and safe absence margins.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs"
          >
            Add First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSubjects.map((subj) => {
            const calc = calcMap.get(subj.id);
            if (!calc) return null;

            const statusColor =
              calc.status === 'safe'
                ? '#10B981'
                : calc.status === 'warning'
                ? '#F59E0B'
                : '#F43F5E';

            return (
              <div
                key={subj.id}
                className="liquid-glass liquid-glass-interactive rounded-3xl p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono font-semibold text-sky-400">{subj.code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{subj.periodsPerWeek} periods/wk</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mt-1 leading-snug">
                        {subj.name}
                      </h3>
                      {subj.professor && (
                        <p className="text-xs text-slate-400 mt-0.5">{subj.professor}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(subj)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                        title="Edit subject"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(subj.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
                        title="Delete subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Percentage & 3-Column Numeric Breakdown */}
                  <div className="my-5 p-4 rounded-2xl bg-slate-950/50 border border-white/10">
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="text-xs text-slate-400">{calc.goalModeLabel}</span>
                        <p
                          className={`text-3xl font-bold font-mono tabular-nums mt-0.5 ${
                            calc.status === 'safe'
                              ? 'text-emerald-400'
                              : calc.status === 'warning'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {calc.percentage.toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Target</span>
                        <p className="text-sm font-mono tabular-nums text-white font-semibold">
                          {targetPercentage}%
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, calc.percentage)}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `${targetPercentage}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center border-t border-white/10 pt-3">
                      <div>
                        <p className="text-[11px] text-slate-400">Conducted</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-white mt-0.5">
                          {calc.conducted}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Attended</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                          {calc.attended}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Absent</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-rose-400 mt-0.5">
                          {calc.absent}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirement Callout + One-Tap Logging Buttons */}
                <div className="space-y-4">
                  <div className="text-xs">
                    {calc.classesNeededToReachTarget > 0 ? (
                      <p className="text-rose-300">
                        Required to reach {targetPercentage}%:{' '}
                        <strong className="font-mono tabular-nums text-white">
                          {calc.classesNeededToReachTarget} consecutive classes
                        </strong>
                        {calc.estimatedWeeksToRecover !== null && (
                          <span className="text-slate-400">
                            {' '}
                            (~{calc.estimatedWeeksToRecover} wks)
                          </span>
                        )}
                      </p>
                    ) : calc.safeAbsencesAllowed > 0 ? (
                      <p className="text-emerald-300">
                        Max additional absences allowed:{' '}
                        <strong className="font-mono tabular-nums text-white">
                          {calc.safeAbsencesAllowed} classes
                        </strong>
                      </p>
                    ) : (
                      <p className="text-amber-300">
                        0 additional absences allowed · Attend next class to build buffer
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onQuickMark(subj.id, 'attended')}
                      className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>+1 Attended</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickMark(subj.id, 'missed')}
                      className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>+1 Missed</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="liquid-glass rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-white/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingSubject ? 'Edit Subject Details' : 'Add New Subject'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-4 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Artificial Intelligence"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. CS-401"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Classes Conducted</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={conducted}
                    onChange={(e) => setConducted(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Classes Attended</label>
                  <input
                    type="number"
                    min={0}
                    max={conducted}
                    value={attended}
                    onChange={(e) => setAttended(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Periods / Week</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={periodsPerWeek}
                    onChange={(e) => setPeriodsPerWeek(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Professor / Instructor (Optional)
                </label>
                <input
                  type="text"
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  placeholder="e.g. Dr. Alan Turing"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {formError && <p className="text-xs text-rose-400">{formError}</p>}

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs"
                >
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="liquid-glass rounded-3xl max-w-md w-full p-6 border border-white/20">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-semibold text-white">Delete Subject?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Removing this subject will also delete its associated weekly timetable slots and
              recalculate your overall attendance percentage.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSubject(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
