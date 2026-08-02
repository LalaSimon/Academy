import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ExternalLink, CreditCard, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { useStudentStats } from '@/hooks/useAttendance';
import { usePayments } from '@/hooks/usePayments';
import { useClasses } from '@/hooks/useClasses';
import { TodaySchedule } from '@/components/classes/TodaySchedule';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Zaplanowane',
  ONGOING: 'W trakcie',
  COMPLETED: 'Zakończone',
  CANCELLED: 'Odwołane',
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  ONGOING: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  COMPLETED: 'bg-muted/40 text-muted-foreground border border-border',
  CANCELLED: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

function AttendanceRing({ rate }: { rate: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (rate / 100) * circ;
  const color = rate >= 80 ? '#22c55e' : rate >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={96} height={96} className="rotate-[-90deg]">
      <circle cx={48} cy={48} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-border" />
      <circle
        cx={48} cy={48} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const { data: profile } = useStudentProfile();

  // Jedno zapytanie zamiast osobnego na każdą grupę: backend od Fazy 5.2 sam
  // zawęża `GET /classes` do zajęć ucznia. Przy okazji łapie lekcje 1:1, które
  // przy pytaniu per `groupId` w ogóle nie trafiały na dashboard.
  const { data: classesData, isLoading: classesLoading } = useClasses({ limit: 100 });
  const myClasses = classesData?.data ?? [];

  const allUpcoming = myClasses
    .filter((c) => c.status === 'SCHEDULED' && new Date(c.scheduledAt) >= new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3);

  const { data: stats } = useStudentStats(user?.id ?? '');
  const { data: payments } = usePayments({ studentId: user?.id, status: 'PENDING', limit: 100, enabled: !user?.isMinor });

  const pendingCount = payments?.total ?? 0;
  const pendingAmount = (payments?.data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const fmt = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);

  return (
    <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground">
          Witaj, {user?.firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Twój panel ucznia</p>
      </motion.div>

      {/* Co dziś — wspólny komponent, ten sam u nauczyciela i rodzica */}
      <motion.section variants={item}>
        <TodaySchedule
          classes={myClasses}
          isLoading={classesLoading}
          emptyText="Na dziś nie masz zaplanowanych zajęć."
        />
      </motion.section>

      {/* Upcoming classes */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Nadchodzące zajęcia</h2>
          <Link to="/student/classes" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Zobacz wszystkie →
          </Link>
        </div>
        {allUpcoming.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            Brak zaplanowanych zajęć
          </div>
        ) : (
          <div className="space-y-2">
            {allUpcoming.map((cls) => {
              const dt = new Date(cls.scheduledAt);
              return (
                <div key={cls.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className="text-xs text-muted-foreground uppercase">
                      {dt.toLocaleDateString('pl-PL', { month: 'short' })}
                    </p>
                    <p className="text-xl font-bold text-foreground leading-tight">{dt.getDate()}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {dt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{cls.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cls.group?.name ?? 'Zajęcia indywidualne'}
                      {cls.teacher && ` • ${cls.teacher.firstName} ${cls.teacher.lastName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[cls.status]}`}>
                      {STATUS_LABELS[cls.status]}
                    </span>
                    {cls.meetLink && (
                      <a
                        href={cls.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/10 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance */}
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Frekwencja</h2>
            <Link to="/student/attendance" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Szczegóły →
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            {!stats ? (
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-full bg-muted/40 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted/40 rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <AttendanceRing rate={stats.overall.attendanceRate} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      {Math.round(stats.overall.attendanceRate)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-muted-foreground">Obecny:</span>
                    <span className="font-medium text-foreground">{stats.overall.present}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-muted-foreground">Spóźniony:</span>
                    <span className="font-medium text-foreground">{stats.overall.late}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-muted-foreground">Nieobecny:</span>
                    <span className="font-medium text-foreground">{stats.overall.absent}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Łącznie: {stats.overall.total} zajęć
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Payments — hidden for minor students */}
        {!user?.isMinor && (
          <motion.section variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Płatności</h2>
              <Link to="/student/payments" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Zapłać →
              </Link>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5">
              {pendingCount === 0 ? (
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Brak zaległości</p>
                    <p className="text-xs text-muted-foreground">Wszystkie płatności uregulowane</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {pendingCount} {pendingCount === 1 ? 'płatność' : 'płatności'} do opłacenia
                    </p>
                    <p className="text-xs text-muted-foreground">Łącznie: {fmt(pendingAmount)}</p>
                  </div>
                  <Link
                    to="/student/payments"
                    className="ml-auto px-3 py-1.5 text-xs text-white rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                  >
                    Zapłać
                  </Link>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </div>

      {/* Groups overview */}
      {profile?.studentGroups && profile.studentGroups.length > 0 && (
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Moje grupy</h2>
            <Link to="/student/groups" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Zobacz wszystkie →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.studentGroups.map((sg) => (
              <div
                key={sg.group.id}
                className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm"
              >
                <Calendar className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <span className="text-foreground font-medium">{sg.group.name}</span>
                {sg.group.language && (
                  <span className="text-[11px] text-muted-foreground">{sg.group.language}</span>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
