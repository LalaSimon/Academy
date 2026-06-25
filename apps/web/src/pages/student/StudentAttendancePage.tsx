import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useStudentStats } from '@/hooks/useAttendance';

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

export default function StudentAttendancePage() {
  const { user } = useAuthStore();
  const [preset, setPreset] = useState<Preset>('all');
  const range = getRange(preset);
  const { data: stats, isLoading } = useStudentStats(user?.id ?? '', range);

  const presets: { key: Preset; label: string }[] = [
    { key: '30d', label: '30 dni' },
    { key: '90d', label: '90 dni' },
    { key: '6m', label: '6 miesięcy' },
    { key: 'all', label: 'Wszystko' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Frekwencja</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Twoja historia obecności</p>
        </div>
        {/* Period filter */}
        <div className="flex gap-1 bg-muted/30 p-1 rounded-xl">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                preset === p.key
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-2">
              <div className="h-2.5 w-16 bg-muted/40 rounded animate-pulse" />
              <div className="h-7 w-10 bg-muted/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Łącznie zajęć" value={stats.overall.total} color="text-foreground" />
          <StatCard label="Obecny" value={stats.overall.present} color="text-emerald-400" />
          <StatCard label="Nieobecny" value={stats.overall.absent} color="text-red-400" />
          <StatCard label="Spóźniony" value={stats.overall.late} color="text-amber-400" />
        </div>
      ) : null}

      {/* Per-group breakdown */}
      {stats && stats.byGroup.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">Podział per grupę</p>
          </div>
          <div className="divide-y divide-border/40">
            {stats.byGroup.map(({ group, total, present, attendanceRate }) => (
              <div key={group.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {present}/{total} obecności
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* bar */}
                  <div className="w-24 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${attendanceRate}%`,
                        background: attendanceRate >= 80 ? '#22c55e' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-10 text-right">
                    {Math.round(attendanceRate)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {stats && stats.history.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">Historia</p>
          </div>
          <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
            {stats.history.map((h, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-shrink-0 text-[11px] text-muted-foreground w-16">
                  {new Date(h.markedAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{h.class.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{h.class.group.name}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[h.status]}`}>
                  {STATUS_LABELS[h.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.history.length === 0 && !isLoading && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Brak danych frekwencji dla wybranego okresu
        </div>
      )}
    </div>
  );
}
