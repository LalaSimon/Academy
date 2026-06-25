import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateGroup, useUpdateGroup, type Group, type GroupSchedulePayload } from '@/hooks/useGroups';
import { useUsers } from '@/hooks/useUsers';

const DAY_LABELS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

interface SlotState {
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  pricePerClass: string;
}

interface FormValues {
  name: string;
  description: string;
  language: string;
  level: string;
  maxStudents: number;
  teacherId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editGroup?: Group | null;
}

const DEFAULT_SLOT: SlotState = { dayOfWeek: 0, startTime: '18:00', durationMin: 60, pricePerClass: '' };

export function GroupFormModal({ open, onClose, editGroup }: Props) {
  const isEdit = !!editGroup;
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const [apiError, setApiError] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotState[]>([]);
  const { data: teachersData } = useUsers({ role: 'TEACHER', limit: 100 });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { maxStudents: 10 },
  });

  useEffect(() => {
    setApiError(null);
    if (editGroup) {
      reset({
        name: editGroup.name,
        description: editGroup.description ?? '',
        language: editGroup.language ?? '',
        level: editGroup.level ?? '',
        maxStudents: editGroup.maxStudents,
        teacherId: editGroup.teacher.id,
      });
      setSlots([]); // edycja harmonogramu odbywa się w GroupDetailPage
    } else {
      reset({ name: '', description: '', language: '', level: '', maxStudents: 10, teacherId: '' });
      setSlots([]);
    }
  }, [editGroup, open, reset]);

  const teacherId = watch('teacherId');

  const addSlot = () => setSlots((prev) => [...prev, { ...DEFAULT_SLOT }]);

  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i));

  const updateSlot = (i: number, field: keyof SlotState, value: string | number) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      const payload = {
        ...data,
        description: data.description || undefined,
        language: data.language || undefined,
        level: data.level || undefined,
      };

      if (isEdit) {
        await updateGroup.mutateAsync({ id: editGroup!.id, ...payload });
      } else {
        const schedules: GroupSchedulePayload[] = slots
          .filter((s) => s.pricePerClass && s.startTime)
          .map((s) => ({
            dayOfWeek: Number(s.dayOfWeek),
            startTime: s.startTime,
            durationMin: Number(s.durationMin),
            pricePerClass: s.pricePerClass,
          }));
        await createGroup.mutateAsync({ ...payload, schedules: schedules.length ? schedules : undefined });
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (Array.isArray(msg)) setApiError(msg.join(', '));
      else setApiError(msg ?? 'Wystąpił błąd. Spróbuj ponownie.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj grupę' : 'Nowa grupa'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="name">Nazwa grupy</Label>
            <Input id="name" {...register('name', { required: true })} placeholder="np. Angielski A1 — Poniedziałki" />
            {errors.name && <p className="text-xs text-red-500">Wymagane</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="language">Język</Label>
              <Input id="language" {...register('language')} placeholder="np. Angielski" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="level">Poziom</Label>
              <Input id="level" {...register('level')} placeholder="np. A1, B2" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nauczyciel</Label>
            <Select
              value={teacherId ?? ''}
              onValueChange={(v: string | null) => setValue('teacherId', v ?? '', { shouldValidate: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {teacherId
                    ? (() => {
                        const t = teachersData?.data.find((t) => t.id === teacherId);
                        return t ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() : teacherId;
                      })()
                    : <span className="text-muted-foreground">Wybierz nauczyciela</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teachersData?.data.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName ?? ''} {t.lastName ?? ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.teacherId && <p className="text-xs text-red-500">Wymagane</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="maxStudents">Maks. uczniów</Label>
              <Input id="maxStudents" type="number" min={1} max={50} {...register('maxStudents', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Opis (opcjonalnie)</Label>
              <Input id="description" {...register('description')} placeholder="Krótki opis" />
            </div>
          </div>

          {/* Harmonogram — tylko przy tworzeniu */}
          {!isEdit && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Harmonogram zajęć cyklicznych</p>
                  <p className="text-xs text-gray-400">Zajęcia generowane automatycznie co miesiąc</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={addSlot} className="gap-1.5 text-violet-600 hover:text-violet-700">
                  <Plus className="w-3.5 h-3.5" />
                  Dodaj slot
                </Button>
              </div>

              {slots.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-xl">
                  Brak slotów — grupa bez zajęć cyklicznych
                </p>
              )}

              {slots.map((slot, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Slot {i + 1}</span>
                    <button type="button" onClick={() => removeSlot(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Dzień tygodnia</Label>
                      <Select
                        value={String(slot.dayOfWeek)}
                        onValueChange={(v: string | null) => v && updateSlot(i, 'dayOfWeek', Number(v))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue>{DAY_LABELS[slot.dayOfWeek]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_LABELS.map((label, idx) => (
                            <SelectItem key={idx} value={String(idx)}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Godzina</Label>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Czas trwania (min)</Label>
                      <Input
                        type="number"
                        min={15}
                        max={480}
                        value={slot.durationMin}
                        onChange={(e) => updateSlot(i, 'durationMin', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Cena za lekcję (PLN)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="120.00"
                        value={slot.pricePerClass}
                        onChange={(e) => updateSlot(i, 'pricePerClass', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {apiError && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{apiError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-violet-500 hover:bg-violet-600 text-white">
              {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utwórz grupę'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
