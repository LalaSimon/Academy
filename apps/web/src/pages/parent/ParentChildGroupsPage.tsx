import { useParams } from 'react-router-dom';
import { BookOpen, Clock, User } from 'lucide-react';
import { useChildProfile } from '@/hooks/useParentProfile';
import { useGroup } from '@/hooks/useGroups';

const DAY_LABELS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

function GroupCard({ groupId }: { groupId: string }) {
  const { data: group, isLoading } = useGroup(groupId);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="h-4 w-40 bg-muted/40 rounded animate-pulse" />
        <div className="h-3 w-24 bg-muted/40 rounded animate-pulse" />
        <div className="h-3 w-32 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }
  if (!group) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground truncate">{group.name}</h3>
          {group.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>}
        </div>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${group.isActive ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {group.language && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium">{group.language}</span>
        )}
        {group.level && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">{group.level}</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <User className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{group.teacher.firstName} {group.teacher.lastName}</span>
      </div>

      {group.schedules.length > 0 && (
        <div className="space-y-1.5">
          {group.schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{DAY_LABELS[s.dayOfWeek]} {s.startTime} ({s.durationMin} min)</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Uczniowie</span>
          <span>{group._count.students} / {group.maxStudents}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, (group._count.students / group.maxStudents) * 100)}%`, background: 'linear-gradient(to right, #8b5cf6, #6366f1)' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ParentChildGroupsPage() {
  const { childId } = useParams<{ childId: string }>();
  const { data: profile, isLoading } = useChildProfile(childId);
  const groupIds = profile?.studentGroups?.map((sg) => sg.group.id) ?? [];
  const childName = profile ? `${profile.firstName} ${profile.lastName}` : '...';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Grupy</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{childName}</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="h-4 w-40 bg-muted/40 rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && groupIds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <BookOpen className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Brak przypisanych grup</p>
        </div>
      )}

      {groupIds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupIds.map((id) => <GroupCard key={id} groupId={id} />)}
        </div>
      )}
    </div>
  );
}
