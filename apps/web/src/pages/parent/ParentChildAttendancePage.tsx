import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChildProfile } from '@/hooks/useParentProfile';
import { useStudentStats, type StudentStats } from '@/hooks/useAttendance';

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Obecny',
  ABSENT: 'Nieobecny',
  LATE: 'Spóźniony',
  EXCUSED: 'Usprawiedliwiony',
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  ABSENT: 'bg-red-500/15 text-red-400 border border-red-500/20',
  LATE: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  EXCUSED: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
};

type Preset = '30d' | '90d' | '6m' | 'all';

function getRange(preset: Preset): { from?: string; to?: string } {
  const now = new Date();
  if (preset === 'all') return {};
  const days = preset === '30d' ? 30 : preset === '90d' ? 90 : 180;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function ParentChildAttendancePage() {
  const { childId } = useParams<{ childId: string }>();
  const { data: profile } = useChildProfile(childId);
  const [preset, setPreset] = useState<Preset>('all');
  const range = getRange(preset);
  const { data: stats, isLoading } = useStudentStats(childId ?? '', range);

  const presets: { key: Preset; label: string }[] = [
    { key: '30d', label: '30 dni' },
    { key: '90d', label: '90 dni' },
    { key: '6m', label: '6 miesięcy' },
    { key: 'all', label: 'Wszystko' },
  ];

  const childName = profile ? `${profile.firstName} ${profile.lastName}` : '...';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Frekwencja</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{childName}</p>
        </div>
        <div className="flex gap-1 bg-muted/30 p-1 rounded-xl">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${preset === p.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : !stats ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Łącznie" value={stats.overall.total} color="text-foreground" />
            <StatCard label="Obecny" value={stats.overall.present} color="text-emerald-500" />
            <StatCard label="Nieobecny" value={stats.overall.absent} color="text-red-500" />
            <StatCard
              label="Frekwencja"
              value={stats.overall.attendanceRate}
              color={stats.overall.attendanceRate >= 80 ? 'text-emerald-500' : stats.overall.attendanceRate >= 60 ? 'text-amber-500' : 'text-red-500'}
            />
          </div>

          {stats.byGroup?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Per grupa</h2>
              <div className="grid gap-3">
                {stats.byGroup.map((g: StudentStats['byGroup'][number]) => (
                  <div key={g.group.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{g.group.name}</p>
                      <p className="text-xs text-muted-foreground">{g.total} zajęć · {g.present} obecności</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${g.attendanceRate >= 80 ? 'text-emerald-500' : g.attendanceRate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {g.attendanceRate}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.history?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Historia</h2>
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {stats.history.map((h: StudentStats['history'][number]) => (
                  <div key={h.class.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{h.class.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.class.scheduledAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[h.status]}`}>
                      {STATUS_LABELS[h.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
