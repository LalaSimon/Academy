import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, ChevronDown, Clock, BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser, useTeacherStats } from '@/hooks/useUsers';

const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

type Preset = '30d' | '90d' | '6m' | 'school-year' | 'custom';

const PRESETS: { id: Preset; label: string }[] = [
  { id: '30d', label: 'Ostatnie 30 dni' },
  { id: '90d', label: 'Ostatnie 90 dni' },
  { id: '6m', label: 'Ostatnie 6 mies.' },
  { id: 'school-year', label: 'Rok szkolny' },
  { id: 'custom', label: 'Własny zakres' },
];

function presetToRange(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === '30d') return { from: fmt(new Date(Date.now() - 30 * 86400000)), to: fmt(now) };
  if (preset === '90d') return { from: fmt(new Date(Date.now() - 90 * 86400000)), to: fmt(now) };
  if (preset === '6m') return { from: fmt(new Date(Date.now() - 180 * 86400000)), to: fmt(now) };
  if (preset === 'school-year') {
    const sep = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${sep}-09-01`, to: fmt(now) };
  }
  return { from: customFrom || undefined, to: customTo || undefined };
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl px-5 py-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export function TeacherProfilePage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const [preset, setPreset] = useState<Preset>('school-year');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const range = presetToRange(preset, customFrom, customTo);
  const { data: teacher, isLoading: loadingTeacher } = useUser(teacherId!);
  const { data: stats, isLoading: loadingStats } = useTeacherStats(teacherId!, range);

  if (loadingTeacher || loadingStats) {
    return <p className="text-center py-16 text-gray-400">Ładowanie...</p>;
  }
  if (!teacher) return <p className="text-center py-16 text-gray-400">Nie znaleziono nauczyciela.</p>;

  const initials = `${teacher.firstName?.[0] ?? ''}${teacher.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/teachers" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Statystyki nauczyciela</h1>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowPresets(p => !p)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            {PRESETS.find(p => p.id === preset)?.label}
            <ChevronDown size={14} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-44">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => { setPreset(p.id); setShowPresets(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${preset === p.id ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {preset === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-gray-400 text-sm">–</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </>
        )}
        {preset !== 'custom' && range.from && (
          <span className="text-xs text-gray-400">
            {new Date(range.from).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' – '}
            {new Date(range.to!).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Teacher card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-indigo-600">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{teacher.firstName} {teacher.lastName}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {teacher.email && (
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <Mail className="w-3.5 h-3.5" />{teacher.email}
              </span>
            )}
            {teacher.phone && (
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <Phone className="w-3.5 h-3.5" />{teacher.phone}
              </span>
            )}
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${teacher.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {teacher.isActive ? 'Aktywny' : 'Nieaktywny'}
        </div>
      </motion.div>

      {stats && (
        <>
          {/* Overall */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Podsumowanie okresu</h2>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Łącznie zajęć" value={stats.overall.total} color="bg-gray-50 text-gray-700" />
              <StatCard label="Zrealizowane" value={stats.overall.completed} color="bg-green-50 text-green-700" />
              <StatCard label="Anulowane" value={stats.overall.cancelled} color="bg-red-50 text-red-700" />
              <StatCard
                label="Godziny lekcyjne"
                value={stats.overall.hours.toFixed(1)}
                sub="tylko zrealizowane"
                color="bg-indigo-50 text-indigo-700"
              />
            </div>
          </motion.div>

          {/* By month */}
          {stats.byMonth.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Zestawienie miesięczne
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Miesiąc</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Zaplanowane</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Zrealizowane</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Godziny</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.byMonth.map((m) => (
                      <tr key={`${m.year}-${m.month}`} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {MONTHS_PL[m.month - 1]} {m.year}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{m.total}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${m.completed === m.total ? 'text-green-600' : 'text-amber-600'}`}>
                            {m.completed}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-indigo-600">
                          {m.hours.toFixed(1)} h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Razem</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700">{stats.overall.total}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-700">{stats.overall.completed}</td>
                      <td className="px-5 py-3 text-right font-bold text-indigo-700">{stats.overall.hours.toFixed(1)} h</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.div>
          )}

          {/* By group */}
          {stats.byGroup.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" /> Podział na grupy
              </h2>
              <div className="space-y-3">
                {stats.byGroup.map((bg, i) => (
                  <motion.div key={bg.group.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.04 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{bg.group.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[bg.group.language, bg.group.level].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600 text-lg">{bg.hours.toFixed(1)} h</p>
                        <p className="text-xs text-gray-400">{bg.completed} z {bg.total} zajęć</p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-3 py-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-sm font-semibold text-green-700">{bg.completed}</span>
                        <span className="text-xs text-green-600 opacity-70">zrealizowane</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-3 py-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-sm font-semibold text-red-600">{bg.total - bg.completed}</span>
                        <span className="text-xs text-red-500 opacity-70">niezrealizowane</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stats.overall.total === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center text-gray-400 text-sm">
              Brak zajęć w wybranym okresie.
            </div>
          )}
        </>
      )}
    </div>
  );
}
