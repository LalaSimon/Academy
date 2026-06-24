import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudentStats } from '@/hooks/useAttendance';
import { useUser } from '@/hooks/useUsers';

const STATUS_COLORS = {
  PRESENT: 'bg-green-500',
  LATE: 'bg-amber-400',
  ABSENT: 'bg-red-400',
  EXCUSED: 'bg-blue-400',
};
const STATUS_LABELS = { PRESENT: 'Obecny', LATE: 'Spóźniony', ABSENT: 'Nieobecny', EXCUSED: 'Usprawiedliwiony' };

function RateCircle({ rate }: { rate: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;
  return (
    <svg width="72" height="72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="#8b5cf6" strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
        className="fill-gray-900 text-xs font-bold" transform="rotate(90 36 36)" fontSize="13">
        {rate}%
      </text>
    </svg>
  );
}

export function StudentAttendancePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data: student } = useUser(studentId!);
  const { data: stats, isLoading } = useStudentStats(studentId!);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/students" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Frekwencja — {student?.firstName} {student?.lastName}
          </h1>
          <p className="text-sm text-gray-400">{student?.email}</p>
        </div>
      </div>

      {isLoading && <p className="text-center py-16 text-gray-400">Ładowanie...</p>}

      {stats && (
        <>
          {/* Overall stats */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-8">
            <RateCircle rate={stats.overall.attendanceRate} />
            <div className="grid grid-cols-4 gap-6 flex-1">
              {(['present', 'late', 'absent', 'excused'] as const).map((key) => (
                <div key={key} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.overall[key]}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{STATUS_LABELS[key.toUpperCase() as keyof typeof STATUS_LABELS]}</p>
                </div>
              ))}
            </div>
            <div className="text-right text-sm text-gray-400 shrink-0">
              Łącznie: <span className="font-semibold text-gray-700">{stats.overall.total}</span> zajęć
            </div>
          </motion.div>

          {/* Per-group breakdown */}
          {stats.byGroup.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">Według grup</h2>
              {stats.byGroup.map((bg, i) => (
                <motion.div key={bg.group.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{bg.group.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {bg.group.language} {bg.group.level} · {bg.total} zajęć
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="text-green-600 font-medium">{bg.present}P</span>
                    <span className="text-amber-500 font-medium">{bg.late}S</span>
                    <span className="text-red-500 font-medium">{bg.absent}N</span>
                    <span className="text-blue-500 font-medium">{bg.excused}U</span>
                  </div>
                  <div className="w-20 text-right">
                    <span className={`text-sm font-bold ${bg.attendanceRate >= 80 ? 'text-green-600' : bg.attendanceRate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {bg.attendanceRate}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* History */}
          {stats.history.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Historia
              </h2>
              {stats.history.map((h, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[h.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{h.class.title}</p>
                    <p className="text-xs text-gray-400">{h.class.group.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(h.class.scheduledAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${
                      h.status === 'PRESENT' ? 'text-green-600' : h.status === 'LATE' ? 'text-amber-500' : h.status === 'ABSENT' ? 'text-red-500' : 'text-blue-500'
                    }`}>{STATUS_LABELS[h.status]}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {stats.overall.total === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              Brak danych o frekwencji.
            </div>
          )}
        </>
      )}
    </div>
  );
}
