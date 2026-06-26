import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Video } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useChildProfile } from '@/hooks/useParentProfile';
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

export default function ParentChildClassesPage() {
  const { childId } = useParams<{ childId: string }>();
  const [tab, setTab] = useState<Tab>('upcoming');
  const { data: profile, isLoading: profileLoading } = useChildProfile(childId);
  const groupIds = profile?.studentGroups?.map((sg) => sg.group.id) ?? [];

  const classQueries = useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: ['classes', { groupId, limit: 200 }],
      queryFn: () =>
        api.get<ClassesResponse>('/classes', { params: { groupId, limit: 200 } }).then((r) => r.data),
    })),
  });

  const allClasses = classQueries.flatMap((q) => q.data?.data ?? []);
  const now = new Date();

  const filtered = allClasses.filter((c) => {
    if (tab === 'upcoming') return new Date(c.scheduledAt) >= now && c.status !== 'CANCELLED';
    if (tab === 'past') return new Date(c.scheduledAt) < now || c.status === 'COMPLETED' || c.status === 'CANCELLED';
    return true;
  }).sort((a, b) => {
    if (tab === 'past') return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  const isLoading = profileLoading || classQueries.some((q) => q.isLoading && groupIds.length > 0);

  const childName = profile ? `${profile.firstName} ${profile.lastName}` : '...';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Zajęcia</h1>
        <p className="text-muted-foreground text-sm mt-1">{childName}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(['upcoming', 'past', 'all'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'upcoming' ? 'Nadchodzące' : t === 'past' ? 'Poprzednie' : 'Wszystkie'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-sm">Brak zajęć</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((cls) => {
              const d = new Date(cls.scheduledAt);
              return (
                <div key={cls.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors">
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {d.toLocaleDateString('pl-PL', { month: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-foreground leading-none">{d.getDate()}</p>
                    <p className="text-[11px] text-muted-foreground">{d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{cls.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cls.durationMin} min
                      {(cls as { group?: { name?: string } }).group?.name && ` · ${(cls as { group: { name: string } }).group.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(cls as { meetLink?: string }).meetLink && cls.status === 'SCHEDULED' && (
                      <a
                        href={(cls as { meetLink: string }).meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[cls.status]}`}>
                      {STATUS_LABELS[cls.status]}
                    </span>
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
