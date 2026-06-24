import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClasses, type Class } from '@/hooks/useClasses';
import { AttendanceModal } from '@/components/attendance/AttendanceModal';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Zaplanowane',
  ONGOING: 'W trakcie',
  COMPLETED: 'Zakończone',
  CANCELLED: 'Odwołane',
};

export function AttendancePage() {
  const { data, isLoading } = useClasses({ limit: 100 });
  const [attendanceClass, setAttendanceClass] = useState<Class | null>(null);

  const classes = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Frekwencja</h1>
        <p className="text-sm text-gray-400 mt-0.5">Zaznaczaj obecność i przeglądaj statystyki uczniów</p>
      </div>

      {isLoading && <p className="text-center py-16 text-gray-400">Ładowanie...</p>}

      {!isLoading && classes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Brak zajęć.
        </div>
      )}

      <div className="space-y-2">
        {classes.map((cls, i) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex flex-col items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-violet-600 leading-none">
                {new Date(cls.scheduledAt).toLocaleDateString('pl-PL', { day: '2-digit' })}
              </span>
              <span className="text-xs text-violet-400">
                {new Date(cls.scheduledAt).toLocaleDateString('pl-PL', { month: 'short' })}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">{cls.title}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[cls.status]}`}>
                  {STATUS_LABELS[cls.status]}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                {cls.group.name} · {new Date(cls.scheduledAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                {' · '}{cls._count.attendances} zaznaczonych
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg px-3"
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
