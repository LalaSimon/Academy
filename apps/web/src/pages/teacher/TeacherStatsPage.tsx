import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, CalendarDays, XCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useTeacherStats } from '@/hooks/useUsers';

const PRESETS = [
  { key: '30d', label: '30 dni', days: 30 },
  { key: '90d', label: '90 dni', days: 90 },
  { key: '6m', label: '6 miesięcy', days: 182 },
  { key: 'year', label: 'Rok szkolny', days: 365 },
] as const;

const MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

export function TeacherStatsPage() {
  const { user } = useAuthStore();
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['key']>('30d');

  const days = PRESETS.find((p) => p.key === preset)?.days ?? 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Backend pozwala nauczycielowi pobrać wyłącznie własne statystyki (self-check).
  const { data, isLoading } = useTeacherStats(user?.id ?? '', { from });

  const cards = [
    { label: 'Godziny', value: data ? `${data.overall.hours.toFixed(1)} h` : '—', icon: Clock, tone: 'text-violet-500' },
    { label: 'Zakończone', value: data?.overall.completed ?? '—', icon: CheckCircle2, tone: 'text-emerald-500' },
    { label: 'Zaplanowane', value: data?.overall.scheduled ?? '—', icon: CalendarDays, tone: 'text-sky-500' },
    { label: 'Odwołane', value: data?.overall.cancelled ?? '—', icon: XCircle, tone: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rozliczenie godzin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Twoje zajęcia w wybranym okresie — podstawa do rozliczenia ze szkołą.
        </p>
      </div>

      {/* Filtr okresu */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              preset === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Karty podsumowania */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, tone }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: i * 0.03 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <Icon className={`w-4 h-4 ${tone}`} />
            <p className="text-2xl font-semibold text-foreground mt-2 tabular-nums">{value}</p>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Ładowanie…</p>}

      {/* Rozbicie miesięczne */}
      {data && data.byMonth.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-[14px] font-medium text-foreground">Miesięcznie</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-4 py-2.5">Miesiąc</th>
                  <th className="text-right font-medium px-4 py-2.5">Zajęcia</th>
                  <th className="text-right font-medium px-4 py-2.5">Zakończone</th>
                  <th className="text-right font-medium px-4 py-2.5">Godziny</th>
                </tr>
              </thead>
              <tbody>
                {data.byMonth.map((m) => (
                  <tr key={`${m.year}-${m.month}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-foreground">
                      {MONTHS[m.month - 1]} {m.year}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{m.total}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{m.completed}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-foreground">
                      {m.hours.toFixed(1)} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rozbicie na grupy */}
      {data && data.byGroup.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-[14px] font-medium text-foreground">Według grup</h2>
          </div>
          <div className="divide-y divide-border">
            {data.byGroup.map((g) => (
              <div key={g.group.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13.5px] text-foreground truncate">{g.group.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {[g.group.language, g.group.level].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13.5px] font-medium text-foreground tabular-nums">
                    {g.hours.toFixed(1)} h
                  </p>
                  <p className="text-[12px] text-muted-foreground tabular-nums">
                    {g.completed}/{g.total} zakończonych
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.overall.total === 0 && !isLoading && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Brak zajęć w wybranym okresie.</p>
        </div>
      )}
    </div>
  );
}
