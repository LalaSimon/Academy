import { useState, useEffect } from 'react';
import { Check, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClassAttendance, useBulkUpdateAttendance, type AttendanceStatus, type AttendanceItem } from '@/hooks/useAttendance';

const STATUS_CONFIG: Pick<Record<AttendanceStatus, { label: string; icon: React.ReactNode; bg: string; text: string; ring: string }>, 'PRESENT' | 'ABSENT'> = {
  PRESENT: { label: 'Obecny',    icon: <Check className="w-4 h-4" />, bg: 'bg-green-500', text: 'text-white', ring: 'ring-green-400' },
  ABSENT:  { label: 'Nieobecny', icon: <X className="w-4 h-4" />,     bg: 'bg-red-500',   text: 'text-white', ring: 'ring-red-400' },
};

const STATUSES: ('PRESENT' | 'ABSENT')[] = ['PRESENT', 'ABSENT'];

interface Props {
  open: boolean;
  onClose: () => void;
  classId: string;
  classTitle: string;
}

export function AttendanceModal({ open, onClose, classId, classTitle }: Props) {
  const { data, isLoading } = useClassAttendance(classId);
  const bulkUpdate = useBulkUpdateAttendance();
  const [local, setLocal] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      const map: Record<string, AttendanceStatus> = {};
      data.forEach((r) => { map[r.student.id] = r.status; });
      setLocal(map);
      setSaved(false);
    }
  }, [data]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setLocal((prev) => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleSave = async () => {
    const items: AttendanceItem[] = Object.entries(local).map(([studentId, status]) => ({ studentId, status }));
    await bulkUpdate.mutateAsync({ classId, items });
    setSaved(true);
  };

  const presentCount = Object.values(local).filter((s) => s === 'PRESENT').length;
  const total = Object.keys(local).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lista obecności</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">{classTitle}</p>
        </DialogHeader>

        {isLoading && <p className="text-center py-8 text-muted-foreground">Ładowanie...</p>}

        {!isLoading && data && (
          <>
            <div className="mb-3">
              <span className="text-sm text-muted-foreground">
                Obecnych: <span className="font-semibold text-foreground">{presentCount}/{total}</span>
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {data.map((record) => {
                const current = (local[record.student.id] ?? record.status) as 'PRESENT' | 'ABSENT';
                return (
                  <div key={record.student.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-violet-500 dark:text-violet-400">
                        {(record.student.firstName?.[0] ?? '?')}{(record.student.lastName?.[0] ?? '')}
                      </span>
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {record.student.firstName} {record.student.lastName}
                    </span>
                    <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                      {STATUSES.map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        const active = current === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(record.student.id, s)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                              active ? `${cfg.bg} ${cfg.text}` : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {data.length === 0 && (
              <p className="text-center py-6 text-sm text-muted-foreground">Brak uczniów w grupie.</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              {saved && <span className="text-xs text-green-500 font-medium">Zapisano ✓</span>}
              {!saved && <span />}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>Zamknij</Button>
                <Button
                  onClick={handleSave}
                  disabled={bulkUpdate.isPending || data.length === 0}
                  className="text-white gap-2"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                >
                  <Save className="w-4 h-4" />
                  {bulkUpdate.isPending ? 'Zapisywanie...' : 'Zapisz'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
