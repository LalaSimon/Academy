import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateClass, useUpdateClass, type Class } from '@/hooks/useClasses';
import { useGroups } from '@/hooks/useGroups';

interface FormValues {
  title: string;
  description: string;
  scheduledAt: string;
  durationMin: number;
  meetLink: string;
  groupId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editClass?: Class | null;
  defaultGroupId?: string;
}

export function ClassFormModal({ open, onClose, editClass, defaultGroupId }: Props) {
  const isEdit = !!editClass;
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const [apiError, setApiError] = useState<string | null>(null);
  const { data: groupsData } = useGroups({ limit: 100 });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { durationMin: 60, groupId: defaultGroupId ?? '' },
  });

  useEffect(() => {
    setApiError(null);
    if (editClass) {
      const local = new Date(editClass.scheduledAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      const localStr = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
      reset({
        title: editClass.title,
        description: editClass.description ?? '',
        scheduledAt: localStr,
        durationMin: editClass.durationMin,
        meetLink: editClass.meetLink ?? '',
        groupId: editClass.group.id,
      });
    } else {
      reset({ title: '', description: '', scheduledAt: '', durationMin: 60, meetLink: '', groupId: defaultGroupId ?? '' });
    }
  }, [editClass, open, reset, defaultGroupId]);  // eslint-disable-line

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      const payload = {
        ...data,
        description: data.description || undefined,
        meetLink: data.meetLink || undefined,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      };
      if (isEdit) {
        const { groupId: _g, ...rest } = payload;
        await updateClass.mutateAsync({ id: editClass!.id, ...rest });
      } else {
        await createClass.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (Array.isArray(msg)) setApiError(msg.join(', '));
      else setApiError(msg ?? 'Wystąpił błąd. Spróbuj ponownie.');
    }
  };

  const groupId = watch('groupId');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj zajęcia' : 'Nowe zajęcia'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="title">Tytuł</Label>
            <Input id="title" {...register('title', { required: true })} placeholder="np. Angielski — lekcja 5" />
            {errors.title && <p className="text-xs text-red-500">Wymagane</p>}
          </div>

          <div className="space-y-1">
            <Label>Grupa</Label>
            <Select value={groupId ?? ''} onValueChange={(v: string | null) => v && setValue('groupId', v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {groupId
                    ? (() => { const g = groupsData?.data.find((g) => g.id === groupId); return g ? g.name : groupId; })()
                    : <span className="text-muted-foreground">Wybierz grupę</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groupsData?.data.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.groupId && <p className="text-xs text-red-500">Wymagane</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="scheduledAt">Data i godzina</Label>
              <Input id="scheduledAt" type="datetime-local" {...register('scheduledAt', { required: true })} />
              {errors.scheduledAt && <p className="text-xs text-red-500">Wymagane</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="durationMin">Czas trwania (min)</Label>
              <Input id="durationMin" type="number" min={15} max={480} step={15}
                {...register('durationMin', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meetLink">Link Meet (opcjonalnie)</Label>
              <Input id="meetLink" {...register('meetLink')} placeholder="https://meet.google.com/..." />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Input id="description" {...register('description')} placeholder="Temat zajęć..." />
          </div>

          {apiError && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{apiError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-violet-500 hover:bg-violet-600 text-white">
              {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utwórz zajęcia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
