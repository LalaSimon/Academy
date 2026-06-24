import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateGroup, useUpdateGroup, type Group } from '@/hooks/useGroups';
import { useUsers } from '@/hooks/useUsers';

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

export function GroupFormModal({ open, onClose, editGroup }: Props) {
  const isEdit = !!editGroup;
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const { data: teachersData } = useUsers({ role: 'TEACHER', limit: 100 });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { maxStudents: 10 },
  });

  useEffect(() => {
    if (editGroup) {
      reset({
        name: editGroup.name,
        description: editGroup.description ?? '',
        language: editGroup.language ?? '',
        level: editGroup.level ?? '',
        maxStudents: editGroup.maxStudents,
        teacherId: editGroup.teacher.id,
      });
    } else {
      reset({ name: '', description: '', language: '', level: '', maxStudents: 10, teacherId: '' });
    }
  }, [editGroup, reset]);

  const onSubmit = async (data: FormValues) => {
    const payload = {
      ...data,
      description: data.description || undefined,
      language: data.language || undefined,
      level: data.level || undefined,
    };

    if (isEdit) {
      await updateGroup.mutateAsync({ id: editGroup!.id, ...payload });
    } else {
      await createGroup.mutateAsync(payload);
    }
    onClose();
  };

  const teacherId = watch('teacherId');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
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
            <Select value={teacherId ?? ''} onValueChange={(v: string | null) => setValue('teacherId', v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz nauczyciela" />
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

          <div className="space-y-1">
            <Label htmlFor="maxStudents">Maks. uczniów</Label>
            <Input id="maxStudents" type="number" min={1} max={50} {...register('maxStudents', { valueAsNumber: true })} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Input id="description" {...register('description')} placeholder="Krótki opis grupy" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-violet-500 hover:bg-violet-600 text-white">
              {isEdit ? 'Zapisz zmiany' : 'Utwórz grupę'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
