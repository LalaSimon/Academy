import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Video, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useClasses } from '@/hooks/useClasses';
import { useTeacherStats } from '@/hooks/useUsers';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function TeacherDashboardPage() {
  const { user } = useAuthStore();

  // Backend zawęża listę do zajęć zalogowanego nauczyciela.
  const { data: classesData, isLoading } = useClasses({ limit: 200 });
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stats } = useTeacherStats(user?.id ?? '', { from });

  const { today, upcoming } = useMemo(() => {
    const all = classesData?.data ?? [];
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const active = all
      .filter((c) => c.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    return {
      today: active.filter((c) => {
        const d = new Date(c.scheduledAt);
        return d >= now && d <= endOfDay;
      }),
      upcoming: active
        .filter((c) => new Date(c.scheduledAt) > endOfDay && c.status !== 'COMPLETED')
        .slice(0, 5),
    };
  }, [classesData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Cześć, {user?.firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {today.length > 0
            ? `Masz dziś jeszcze ${today.length} ${today.length === 1 ? 'zajęcia' : 'zajęć'} do poprowadzenia.`
            : 'Na dziś nie masz już zaplanowanych zajęć.'}
        </p>
      </div>

      {/* Skrót statystyk z ostatnich 30 dni */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Clock className="w-4 h-4 text-violet-500" />
          <p className="text-2xl font-semibold text-foreground mt-2 tabular-nums">
            {stats ? `${stats.overall.hours.toFixed(1)} h` : '—'}
          </p>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Godziny (30 dni)</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p className="text-2xl font-semibold text-foreground mt-2 tabular-nums">
            {stats?.overall.completed ?? '—'}
          </p>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Zakończone (30 dni)</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Calendar className="w-4 h-4 text-sky-500" />
          <p className="text-2xl font-semibold text-foreground mt-2 tabular-nums">
            {stats?.overall.scheduled ?? '—'}
          </p>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">Zaplanowane</p>
        </div>
      </div>

      {/* Dzisiaj */}
      <section className="space-y-2.5">
        <h2 className="text-[14px] font-medium text-foreground">Dzisiaj</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Ładowanie…</p>}
        {!isLoading && today.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Brak zajęć na dziś.</p>
          </div>
        )}
        {today.map((cls, i) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: i * 0.03 }}
            className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground text-[15px] truncate">{cls.title}</p>
              <div className="flex items-center gap-4 mt-1.5 text-[12.5px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(cls.scheduledAt)} · {cls.durationMin} min
                </span>
                {cls.group && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {cls.group.name}
                  </span>
                )}
              </div>
            </div>
            {cls.meetLink && (
              <a
                href={cls.meetLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-500/10 transition-colors flex-shrink-0"
              >
                <Video className="w-3.5 h-3.5" />
                Dołącz
              </a>
            )}
          </motion.div>
        ))}
      </section>

      {/* Najbliższe */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-foreground">Najbliższe zajęcia</h2>
          <Link
            to="/teacher/classes"
            className="flex items-center gap-1 text-[12.5px] text-violet-600 dark:text-violet-300 hover:underline"
          >
            Wszystkie
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {!isLoading && upcoming.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Brak nadchodzących zajęć.</p>
          </div>
        )}
        {upcoming.map((cls) => (
          <div
            key={cls.id}
            className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-[14px] text-foreground truncate">{cls.title}</p>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                {formatDay(cls.scheduledAt)} · {formatTime(cls.scheduledAt)}
                {cls.group ? ` · ${cls.group.name}` : ''}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
