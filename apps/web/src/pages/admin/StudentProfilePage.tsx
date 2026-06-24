import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/useUsers';
import { useStudentStats } from '@/hooks/useAttendance';

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl px-5 py-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function RateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`text-sm font-semibold w-10 text-right ${rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
        {rate}%
      </span>
    </div>
  );
}

export function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data: student, isLoading: loadingStudent } = useUser(studentId!);
  const { data: stats, isLoading: loadingStats } = useStudentStats(studentId!);

  if (loadingStudent || loadingStats) {
    return <p className="text-center py-16 text-gray-400">Ładowanie...</p>;
  }

  if (!student) {
    return <p className="text-center py-16 text-gray-400">Nie znaleziono ucznia.</p>;
  }

  const initials = `${student.firstName?.[0] ?? ''}${student.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/students" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Profil ucznia</h1>
      </div>

      {/* Student card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-violet-600">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{student.firstName} {student.lastName}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {student.email && (
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <Mail className="w-3.5 h-3.5" />{student.email}
              </span>
            )}
            {student.phone && (
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <Phone className="w-3.5 h-3.5" />{student.phone}
              </span>
            )}
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {student.isActive ? 'Aktywny' : 'Nieaktywny'}
        </div>
      </motion.div>

      {stats && (
        <>
          {/* Overall stats */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Frekwencja ogółem</h2>
            {stats.overall.total === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center text-gray-400 text-sm">
                Brak danych o frekwencji.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Łącznie zajęć" value={stats.overall.total} color="bg-gray-50 text-gray-700" />
                <StatCard label="Obecny" value={stats.overall.present} color="bg-green-50 text-green-700" />
                <StatCard label="Nieobecny" value={stats.overall.absent} color="bg-red-50 text-red-700" />
                <StatCard
                  label="Frekwencja"
                  value={`${stats.overall.attendanceRate}%`}
                  color={stats.overall.attendanceRate >= 80 ? 'bg-green-100 text-green-700' : stats.overall.attendanceRate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}
                />
              </div>
            )}
          </motion.div>

          {/* Per-group breakdown */}
          {stats.byGroup.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Grupy
              </h2>
              <div className="space-y-3">
                {stats.byGroup.map((bg, i) => (
                  <motion.div key={bg.group.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{bg.group.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[bg.group.language, bg.group.level].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{bg.total} zajęć</span>
                    </div>

                    <RateBar rate={bg.attendanceRate} />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-green-700">{bg.present}</p>
                          <p className="text-xs text-green-600 opacity-70">Obecny</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-600">{bg.absent}</p>
                          <p className="text-xs text-red-500 opacity-70">Nieobecny</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent history */}
          {stats.history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Ostatnie zajęcia
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {stats.history.slice(0, 10).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${h.status === 'PRESENT' ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{h.class.title}</p>
                      <p className="text-xs text-gray-400">{h.class.group.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">
                        {new Date(h.class.scheduledAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${h.status === 'PRESENT' ? 'text-green-600' : 'text-red-500'}`}>
                        {h.status === 'PRESENT' ? 'Obecny' : 'Nieobecny'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
