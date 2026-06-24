import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateBulkClasses } from '@/hooks/useClasses';
import { useGroups } from '@/hooks/useGroups';
import { useUsers } from '@/hooks/useUsers';

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
// date-fns getDay: 0=Sun,1=Mon... — mapujemy nasze checkboxy (0=Pon) na JS day
const CHECKBOX_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

interface FormValues {
  title: string;
  description: string;
  groupId: string;
  teacherId: string;
  timeStart: string;
  durationMin: number;
  meetLink: string;
  dateFrom: string;
  dateTo: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function generateDates(from: string, to: string, time: string, selectedDays: number[]): Date[] {
  if (!from || !to || !time || selectedDays.length === 0) return [];
  const [h, m] = time.split(':').map(Number);
  const result: Date[] = [];
  const end = new Date(to);
  end.setHours(23, 59, 59);
  const cur = new Date(from);
  cur.setHours(h, m, 0, 0);
  while (cur <= end) {
    const jsDay = cur.getDay();
    if (selectedDays.some((d) => CHECKBOX_TO_JS_DAY[d] === jsDay)) {
      result.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function RecurringClassModal({ open, onClose }: Props) {
  const createBulk = useCreateBulkClasses();
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 2]); // Pon, Śr domyślnie
  const [apiError, setApiError] = useState<string | null>(null);
  const { data: groupsData } = useGroups({ limit: 100 });
  const { data: teachersData } = useUsers({ role: 'TEACHER', limit: 100 });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { durationMin: 60, timeStart: '10:00' },
  });

  const [groupId, teacherId, dateFrom, dateTo, timeStart] = watch(['groupId', 'teacherId', 'dateFrom', 'dateTo', 'timeStart']);

  const previewDates = useMemo(
    () => generateDates(dateFrom, dateTo, timeStart, selectedDays),
    [dateFrom, dateTo, timeStart, selectedDays],
  );

  const handleGroupChange = (v: string) => {
    setValue('groupId', v);
    const group = groupsData?.data.find((g) => g.id === v);
    if (group) setValue('teacherId', group.teacher.id);
  };

  const toggleDay = (i: number) => {
    setSelectedDays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort(),
    );
  };

  const onSubmit = async (data: FormValues) => {
    if (previewDates.length === 0) return;
    setApiError(null);
    try {
      const items = previewDates.map((date) => ({
        title: data.title,
        description: data.description || undefined,
        scheduledAt: date.toISOString(),
        durationMin: data.durationMin,
        meetLink: data.meetLink || undefined,
        groupId: data.groupId,
        teacherId: data.teacherId || undefined,
      }));
      await createBulk.mutateAsync(items);
      reset();
      setSelectedDays([0, 2]);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (Array.isArray(msg)) setApiError(msg.join(', '));
      else setApiError(msg ?? 'Wystąpił błąd. Spróbuj ponownie.');
    }
  };

  const selectedTeacher = teachersData?.data.find((t) => t.id === teacherId);
  const selectedGroup = groupsData?.data.find((g) => g.id === groupId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Zajęcia cykliczne</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="r-title">Tytuł</Label>
            <Input id="r-title" {...register('title', { required: true })} placeholder="np. Angielski A1" />
            {errors.title && <p className="text-xs text-red-500">Wymagane</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Grupa</Label>
              <Select value={groupId ?? ''} onValueChange={(v: string | null) => v && handleGroupChange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedGroup ? selectedGroup.name : <span className="text-muted-foreground">Wybierz grupę</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {groupsData?.data.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nauczyciel</Label>
              <Select value={teacherId ?? ''} onValueChange={(v: string | null) => v && setValue('teacherId', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedTeacher
                      ? `${selectedTeacher.firstName ?? ''} ${selectedTeacher.lastName ?? ''}`.trim()
                      : <span className="text-muted-foreground">Wybierz</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teachersData?.data.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName ?? ''} {t.lastName ?? ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dni tygodnia</Label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    selectedDays.includes(i)
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="r-from">Od</Label>
              <Input id="r-from" type="date" {...register('dateFrom', { required: true })} />
              {errors.dateFrom && <p className="text-xs text-red-500">Wymagane</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-to">Do</Label>
              <Input id="r-to" type="date" {...register('dateTo', { required: true })} />
              {errors.dateTo && <p className="text-xs text-red-500">Wymagane</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-time">Godzina</Label>
              <Input id="r-time" type="time" {...register('timeStart', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="r-duration">Czas trwania (min)</Label>
              <Input id="r-duration" type="number" min={15} max={480} step={15}
                {...register('durationMin', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-meet">Link Meet (opcjonalnie)</Label>
              <Input id="r-meet" {...register('meetLink')} placeholder="https://meet.google.com/..." />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="r-desc">Opis (opcjonalnie)</Label>
            <Input id="r-desc" {...register('description')} placeholder="Temat zajęć..." />
          </div>

          {previewDates.length > 0 && (
            <div className="bg-violet-50 rounded-xl px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-violet-700">
                Zostanie utworzone {previewDates.length} {previewDates.length === 1 ? 'zajęcie' : previewDates.length < 5 ? 'zajęcia' : 'zajęć'}:
              </p>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {previewDates.map((d, i) => (
                  <p key={i} className="text-xs text-violet-600">
                    {d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}, {d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ))}
              </div>
            </div>
          )}

          {selectedDays.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Wybierz co najmniej jeden dzień tygodnia.</p>
          )}

          {apiError && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{apiError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Anuluj</Button>
            <Button
              type="submit"
              disabled={isSubmitting || previewDates.length === 0 || selectedDays.length === 0}
              className="bg-violet-500 hover:bg-violet-600 text-white"
            >
              {isSubmitting ? 'Tworzenie...' : `Utwórz ${previewDates.length > 0 ? `(${previewDates.length})` : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
