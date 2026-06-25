import { useState } from 'react';
import { ExternalLink, Video } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { api } from '@/lib/api';
import type { ClassesResponse } from '@/hooks/useClasses';

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

type Tab = 'all' | 'upcoming' | 'past';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="w-12 space-y-1">
        <div className="h-2.5 w-8 bg-muted/40 rounded animate-pulse mx-auto" />
        <div className="h-5 w-6 bg-muted/40 rounded animate-pulse mx-auto" />
        <div className="h-2.5 w-10 bg-muted/40 rounded animate-pulse mx-auto" />
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-48 bg-muted/40 rounded animate-pulse" />
        <div className="h-2.5 w-32 bg-muted/40 rounded animate-pulse" />
      </div>
      <div className="h-5 w-20 bg-muted/40 rounded-full animate-pulse" />
    </div>
  );
}

export default function StudentClassesPage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const { data: profile, isLoading: profileLoading } = useStudentProfile();
  const groupIds = profile?.studentGroups?.map((sg) => sg.group.id) ?? [];

  const classQueries = useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: ['classes', { groupId, limit: 200 }],
      queryFn: () =>
        api.get<ClassesResponse>('/classes', { params: { groupId, limit: 200 } }).then((r) => r.data),
      enabled: groupIds.length > 0,
    })),
  });

  const now = new Date();
  const allClasses = classQueries
    .flatMap((q) => q.data?.data ?? [])
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const filtered = allClasses.filter((c) => {
    const dt = new Date(c.scheduledAt);
    if (tab === 'upcoming') return dt >= now && c.status !== 'CANCELLED';
    if (tab === 'past') return dt < now || c.status === 'COMPLETED' || c.status === 'CANCELLED';
    return true;
  });

  const isLoading = profileLoading || classQueries.some((q) => q.isLoading);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: 'Nadchodzące' },
    { key: 'past', label: 'Poprzednie' },
    { key: 'all', label: 'Wszystkie' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Moje zajęcia</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allClasses.length} zajęć łącznie
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/40">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Brak zajęć w tej kategorii
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((cls) => {
              const dt = new Date(cls.scheduledAt);
              const showMeet = (cls.status === 'SCHEDULED' || cls.status === 'ONGOING') && cls.meetLink;
              return (
                <div key={cls.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                  {/* Date box */}
                  <div
                    className="flex-shrink-0 w-12 text-center py-1.5 px-1 rounded-xl"
                    style={{ background: 'rgba(139,92,246,0.08)' }}
                  >
                    <p className="text-[10px] font-medium text-violet-400 uppercase">
                      {dt.toLocaleDateString('pl-PL', { month: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-violet-500 dark:text-violet-300 leading-tight">
                      {dt.getDate()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {dt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{cls.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cls.group?.name ?? 'Zajęcia indywidualne'}
                      {cls.teacher && ` • ${cls.teacher.firstName} ${cls.teacher.lastName}`}
                      {` • ${cls.durationMin} min`}
                    </p>
                  </div>

                  {/* Status + meet link */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[cls.status]}`}>
                      {STATUS_LABELS[cls.status]}
                    </span>
                    {showMeet && (
                      <a
                        href={cls.meetLink!}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white transition-opacity hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                      >
                        <Video className="w-3 h-3" />
                        Dołącz
                      </a>
                    )}
                    {!showMeet && cls.meetLink && (
                      <a
                        href={cls.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition-all"
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
      </div>
    </div>
  );
}
