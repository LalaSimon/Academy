import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export type ReportType = 'payments' | 'attendance' | 'students';

type Params = Record<string, string | boolean | undefined>;

function extractFilename(disposition: unknown, fallback: string): string {
  if (typeof disposition !== 'string') return fallback;
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match?.[1] ?? fallback;
}

/**
 * Pobiera raport XLSX z backendu i wyzwala zapis pliku w przeglądarce.
 * Puste filtry są pomijane, więc wysyłamy tylko realnie ustawione parametry.
 */
export function useReportDownload() {
  const [loading, setLoading] = useState<ReportType | null>(null);

  const download = async (type: ReportType, params: Params) => {
    setLoading(type);
    try {
      const clean = Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)]),
      );
      const res = await api.get(`/reports/${type}`, {
        params: clean,
        responseType: 'blob',
      });
      const filename = extractFilename(
        res.headers['content-disposition'],
        `raport-${type}.xlsx`,
      );
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Raport wygenerowany');
    } catch {
      toast.error('Nie udało się wygenerować raportu');
    } finally {
      setLoading(null);
    }
  };

  return { download, loading };
}
