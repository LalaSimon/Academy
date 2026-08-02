import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';

const DAYS = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];

export function TeacherGroupsPage() {
  // Backend zawęża listę do grup zalogowanego nauczyciela (rola TEACHER),
  // więc nie przekazujemy tu żadnego teacherId.
  const { data, isLoading } = useGroups({ limit: 100 });
  const groups = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Moje grupy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grupy, które prowadzisz — wraz z listą uczniów i materiałami.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Ładowanie…</p>}

      {!isLoading && groups.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Nie prowadzisz jeszcze żadnej grupy.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.2) }}
          >
            <Link
              to={`/teacher/groups/${g.id}`}
              className="block rounded-2xl border border-border bg-card p-4 hover:border-violet-500/40 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium text-foreground text-[15px] truncate">{g.name}</h2>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5">
                    {[g.language, g.level].filter(Boolean).join(' · ') || 'Bez poziomu'}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors flex-shrink-0 mt-0.5" />
              </div>

              <div className="flex items-center gap-4 mt-3 text-[12.5px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {g._count.students} / {g.maxStudents} uczniów
                </span>
                {g.schedules.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {g.schedules
                      .map((s) => `${DAYS[s.dayOfWeek] ?? '?'} ${s.startTime}`)
                      .join(', ')}
                  </span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
