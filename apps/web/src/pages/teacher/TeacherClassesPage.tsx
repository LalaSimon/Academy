import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Video, ClipboardList, Play, Check } from 'lucide-react';
import { useClasses, useUpdateClassStatus, type Class, type ClassStatus } from '@/hooks/useClasses';
import { AttendanceModal } from '@/components/attendance/AttendanceModal';

type Tab = 'upcoming' | 'past' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Nadchodzące' },
  { key: 'past', label: 'Poprzednie' },
  { key: 'all', label: 'Wszystkie' },
];

const STATUS_LABEL: Record<ClassStatus, string> = {
  SCHEDULED: 'Zaplanowane',
  ONGOING: 'W trakcie',
  COMPLETED: 'Zakończone',
  CANCELLED: 'Odwołane',
};

const STATUS_STYLE: Record<ClassStatus, string> = {
  SCHEDULED: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  ONGOING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  CANCELLED: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TeacherClassesPage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [attendanceFor, setAttendanceFor] = useState<Class | null>(null);

  // Backend sam zawęża wynik do zajęć zalogowanego nauczyciela (rola TEACHER),
  // więc nie przekazujemy tu żadnego teacherId.
  const { data, isLoading } = useClasses({ limit: 200 });
  const updateStatus = useUpdateClassStatus();

  const classes = useMemo(() => {
    const all = data?.data ?? [];
    const now = Date.now();
    const sorted = [...all].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    if (tab === 'upcoming') {
      return sorted.filter(
        (c) => new Date(c.scheduledAt).getTime() >= now && c.status !== 'COMPLETED',
      );
    }
    if (tab === 'past') {
      return sorted
        .filter((c) => new Date(c.scheduledAt).getTime() < now || c.status === 'COMPLETED')
        .reverse();
    }
    return sorted;
  }, [data, tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Moje zajęcia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zajęcia, które prowadzisz — bezpośrednio przypisane oraz wynikające z Twoich grup.
        </p>
      </div>

      {/* Zakładki */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              tab === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Ładowanie…</p>}

      {!isLoading && classes.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {tab === 'upcoming'
              ? 'Brak nadchodzących zajęć.'
              : tab === 'past'
                ? 'Brak zakończonych zajęć.'
                : 'Nie masz jeszcze żadnych zajęć.'}
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {classes.map((cls, i) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
            className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-foreground text-[15px] truncate">{cls.title}</h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_STYLE[cls.status]}`}
                >
                  {STATUS_LABEL[cls.status]}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2 text-[12.5px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDateTime(cls.scheduledAt)} · {cls.durationMin} min
                </span>
                {cls.group && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {cls.group.name}
                  </span>
                )}
                {cls.student && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {cls.student.firstName} {cls.student.lastName} (1:1)
                  </span>
                )}
              </div>

              {cls.status === 'CANCELLED' && cls.cancelReason && (
                <p className="mt-2 text-[12.5px] text-red-500">Powód odwołania: {cls.cancelReason}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {cls.meetLink && cls.status !== 'CANCELLED' && (
                <a
                  href={cls.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-500/10 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  Dołącz
                </a>
              )}

              {cls.status === 'SCHEDULED' && (
                <button
                  onClick={() => updateStatus.mutate({ id: cls.id, status: 'ONGOING' })}
                  disabled={updateStatus.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  Rozpocznij
                </button>
              )}

              {cls.status === 'ONGOING' && (
                <button
                  onClick={() => updateStatus.mutate({ id: cls.id, status: 'COMPLETED' })}
                  disabled={updateStatus.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Zakończ
                </button>
              )}

              {cls.status !== 'CANCELLED' && (
                <button
                  onClick={() => setAttendanceFor(cls)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Obecność
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {attendanceFor && (
        <AttendanceModal
          open={!!attendanceFor}
          onClose={() => setAttendanceFor(null)}
          classId={attendanceFor.id}
          classTitle={attendanceFor.title}
        />
      )}
    </div>
  );
}
