import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Users,
  Video,
  Paperclip,
  Download,
  ExternalLink,
  CalendarCheck,
} from 'lucide-react';
import { useClassesMaterials } from '@/hooks/useMaterials';
import { api } from '@/lib/api';
import type { Class } from '@/hooks/useClasses';
import type { Material } from '@/hooks/useMaterials';

interface Props {
  classes: Class[];
  isLoading?: boolean;
  /** Nagłówek sekcji — rodzic pokazuje imię dziecka, pozostali po prostu „Dzisiaj". */
  title?: string;
  emptyText?: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** MinIO jest wewnętrzne dla Dockera — plik pobieramy strumieniem przez API. */
async function downloadMaterial(m: Material) {
  const res = await api.get(`/materials/${m.id}/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = m.title;
  a.click();
  URL.revokeObjectURL(url);
}

function MaterialChip({ material }: { material: Material }) {
  const isLink = material.type === 'LINK' || !material.fileKey;

  if (isLink) {
    return (
      <a
        href={material.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-[12px] text-foreground hover:bg-accent transition-colors"
      >
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
        {material.title}
      </a>
    );
  }

  return (
    <button
      onClick={() => void downloadMaterial(material)}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-[12px] text-foreground hover:bg-accent transition-colors"
    >
      <Download className="w-3 h-3 text-muted-foreground" />
      {material.title}
    </button>
  );
}

/**
 * „Co mnie dziś czeka" — wspólne dla nauczyciela, ucznia i rodzica.
 *
 * Jeden komponent zamiast trzech kopii: każdy portal przekazuje własną listę
 * zajęć, reszta (godziny, materiały, link do spotkania) jest identyczna.
 * Materiały pobierane są JEDNYM zapytaniem dla wszystkich lekcji naraz.
 */
export function TodaySchedule({
  classes,
  isLoading,
  title = 'Dzisiaj',
  emptyText = 'Na dziś nie masz zaplanowanych zajęć.',
}: Props) {
  const today = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return classes
      .filter((c) => {
        if (c.status === 'CANCELLED') return false;
        const at = new Date(c.scheduledAt);
        // Zajęcia, które już trwają, zostają na liście — inaczej znikałyby
        // dokładnie wtedy, gdy link jest najbardziej potrzebny.
        return at <= endOfDay && (at >= now || c.status === 'ONGOING');
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
  }, [classes]);

  const { data: materialsByClass } = useClassesMaterials(today.map((c) => c.id));

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-violet-500" />
        <h2 className="text-[14px] font-medium text-foreground">{title}</h2>
        {today.length > 0 && (
          <span className="text-[12px] text-muted-foreground">
            {today.length}{' '}
            {today.length === 1 ? 'lekcja' : today.length < 5 ? 'lekcje' : 'lekcji'}
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Ładowanie…</p>}

      {!isLoading && today.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      )}

      {today.map((cls, i) => {
        const materials = materialsByClass?.[cls.id] ?? [];

        return (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.2) }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-medium text-foreground truncate">
                    {cls.title}
                  </span>
                  {cls.status === 'ONGOING' && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      trwa
                    </span>
                  )}
                </div>

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
                  {cls.student && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {cls.student.firstName} {cls.student.lastName}
                    </span>
                  )}
                </div>

                {cls.description && (
                  <p className="text-[12.5px] text-muted-foreground mt-2">
                    {cls.description}
                  </p>
                )}
              </div>

              {cls.meetLink && (
                <a
                  href={cls.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-white flex-shrink-0 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                >
                  <Video className="w-3.5 h-3.5" />
                  Dołącz
                </a>
              )}
            </div>

            {materials.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 mb-2">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">
                    Materiały na te zajęcia
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {materials.map((m) => (
                    <MaterialChip key={m.id} material={m} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </section>
  );
}
