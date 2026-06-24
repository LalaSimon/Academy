import { useState, useEffect } from 'react';
import { Check, Clock, X, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClassAttendance, useBulkUpdateAttendance, type AttendanceStatus, type AttendanceItem } from '@/hooks/useAttendance';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ReactNode; bg: string; text: string; ring: string }> = {
  PRESENT:  { label: 'Obecny',     icon: <Check className="w-3.5 h-3.5" />,       bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-400' },
  LATE:     { label: 'Spóźniony',  icon: <Clock className="w-3.5 h-3.5" />,       bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-400' },
  ABSENT:   { label: 'Nieobecny',  icon: <X className="w-3.5 h-3.5" />,           bg: 'bg-red-50',    text: 'text-red-700',    ring: 'ring-red-400' },
  EXCUSED:  { label: 'Usprawiedl.',icon: <AlertCircle className="w-3.5 h-3.5" />, bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-400' },
};

const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

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

  const presentCount = Object.values(local).filter((s) => s === 'PRESENT' || s === 'LATE').length;
  const total = Object.keys(local).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lista obecności</DialogTitle>
          <p className="text-sm text-gray-400 mt-0.5">{classTitle}</p>
        </DialogHeader>

        {isLoading && <p className="text-center py-8 text-gray-400">Ładowanie...</p>}

        {!isLoading && data && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">
                Obecnych: <span className="font-semibold text-gray-900">{presentCount}/{total}</span>
              </span>
              <div className="flex gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const next: Record<string, AttendanceStatus> = {};
                      Object.keys(local).forEach((id) => { next[id] = s; });
                      setLocal(next);
                      setSaved(false);
                    }}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} border-transparent hover:ring-1 ${STATUS_CONFIG[s].ring}`}
                  >
                    Wszyscy: {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {data.map((record) => {
                const current = local[record.student.id] ?? record.status;
                return (
                  <div key={record.student.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-violet-600">
                        {(record.student.firstName?.[0] ?? '?')}{(record.student.lastName?.[0] ?? '')}
                      </span>
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                      {record.student.firstName} {record.student.lastName}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      {STATUSES.map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        const active = current === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            title={cfg.label}
                            onClick={() => setStatus(record.student.id, s)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              active
                                ? `${cfg.bg} ${cfg.text} ring-2 ${cfg.ring}`
                                : 'bg-white text-gray-300 border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {cfg.icon}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {data.length === 0 && (
              <p className="text-center py-6 text-sm text-gray-400">Brak uczniów w grupie.</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              {saved && <span className="text-xs text-green-600 font-medium">Zapisano ✓</span>}
              {!saved && <span />}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>Zamknij</Button>
                <Button
                  onClick={handleSave}
                  disabled={bulkUpdate.isPending || data.length === 0}
                  className="bg-violet-500 hover:bg-violet-600 text-white gap-2"
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
