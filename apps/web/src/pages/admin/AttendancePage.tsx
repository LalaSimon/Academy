import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClasses, type Class } from '@/hooks/useClasses';
import { AttendanceModal } from '@/components/attendance/AttendanceModal';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  ONGOING: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  CANCELLED: 'bg-muted/40 text-muted-foreground border border-border',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Zaplanowane',
  ONGOING: 'W trakcie',
  COMPLETED: 'Zakończone',
  CANCELLED: 'Odwołane',
};

function SkeletonRow() {
  return (
    <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-muted/40 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-48 rounded bg-muted/50 animate-pulse" />
        <div className="h-3 w-36 rounded bg-muted/40 animate-pulse" />
      </div>
      <div className="h-8 w-24 rounded-lg bg-muted/40 animate-pulse shrink-0" />
    </div>
  );
}

export function AttendancePage() {
  const { data, isLoading } = useClasses({ limit: 100 });
  const [attendanceClass, setAttendanceClass] = useState<Class | null>(null);

  const classes = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Frekwencja</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Zaznaczaj obecność i przeglądaj statystyki uczniów</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {!isLoading && classes.length === 0 && (
        <div className="bg-card rounded-2xl border border-border py-16 text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Brak zajęć.</p>
        </div>
      )}

      <div className="space-y-2">
        {classes.map((cls, i) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.018, duration: 0.2 }}
            className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center gap-4 hover:border-violet-500/25 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
              style={{ background: 'rgba(139,92,246,0.1)' }}>
              <span className="text-xs font-bold text-violet-400 leading-none">
                {new Date(cls.scheduledAt).toLocaleDateString('pl-PL', { day: '2-digit' })}
              </span>
              <span className="text-[10px] text-violet-500/70 mt-0.5">
                {new Date(cls.scheduledAt).toLocaleDateString('pl-PL', { month: 'short' })}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground text-[13.5px] truncate">{cls.title}</p>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[cls.status]}`}>
                  {STATUS_LABELS[cls.status]}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {cls.group?.name ?? `${cls.student?.firstName} ${cls.student?.lastName} (1:1)`} &middot;{' '}
                {new Date(cls.scheduledAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                {' '}&middot; {cls._count.attendances} zaznaczonych
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg px-3"
                onClick={() => setAttendanceClass(cls)}
              >
                <Users className="w-3.5 h-3.5" />
                Obecność
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {attendanceClass && (
        <AttendanceModal
          open={!!attendanceClass}
          onClose={() => setAttendanceClass(null)}
          classId={attendanceClass.id}
          classTitle={attendanceClass.title}
        />
      )}
    </div>
  );
}
