import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePayment, useCreateBulkPayments } from '@/hooks/usePayments';
import { useUsers } from '@/hooks/useUsers';
import { useGroups } from '@/hooks/useGroups';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = 'student' | 'group';

interface FormValues {
  mode: Mode;
  targetId: string;
  amount: string;
  description: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
}

export function PaymentFormModal({ open, onClose }: Props) {
  const createPayment = useCreatePayment();
  const createBulk = useCreateBulkPayments();
  const { data: studentsData } = useUsers({ role: 'STUDENT', limit: 100 });
  const { data: groupsData } = useGroups({ limit: 100 });

  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { mode: 'student', targetId: '', amount: '', description: '', dueDate: '', periodStart: '', periodEnd: '' },
  });

  const mode = watch('mode');

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      amount: values.amount,
      description: values.description,
      dueDate: values.dueDate,
      ...(values.periodStart && { periodStart: values.periodStart }),
      ...(values.periodEnd && { periodEnd: values.periodEnd }),
    };

    if (values.mode === 'student') {
      await createPayment.mutateAsync({ ...payload, studentId: values.targetId });
    } else {
      await createBulk.mutateAsync({ ...payload, groupId: values.targetId });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nowa płatność</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => { setValue('mode', 'student'); setValue('targetId', ''); }}
              className={`flex-1 py-2 transition-colors ${mode === 'student' ? 'bg-violet-500 text-white' : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              Dla ucznia
            </button>
            <button
              type="button"
              onClick={() => { setValue('mode', 'group'); setValue('targetId', ''); }}
              className={`flex-1 py-2 transition-colors ${mode === 'group' ? 'bg-violet-500 text-white' : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              Dla grupy (bulk)
            </button>
          </div>

          {/* Target selector */}
          {mode === 'student' ? (
            <div className="space-y-1">
              <Label>Uczeń</Label>
              <Select onValueChange={(v: string | null) => v && setValue('targetId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz ucznia" />
                </SelectTrigger>
                <SelectContent>
                  {studentsData?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Grupa</Label>
              <Select onValueChange={(v: string | null) => v && setValue('targetId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz grupę" />
                </SelectTrigger>
                <SelectContent>
                  {groupsData?.data.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Kwota (PLN)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="200.00"
                {...register('amount', { required: true, min: 0.01 })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dueDate">Termin płatności</Label>
              <Input id="dueDate" type="date" {...register('dueDate', { required: true })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Opis</Label>
            <Input
              id="description"
              placeholder="Lekcje — czerwiec 2026"
              {...register('description', { required: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="periodStart">Okres od (opcjonalnie)</Label>
              <Input id="periodStart" type="date" {...register('periodStart')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="periodEnd">Okres do (opcjonalnie)</Label>
              <Input id="periodEnd" type="date" {...register('periodEnd')} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-violet-500 hover:bg-violet-600 text-white">
              {isSubmitting ? 'Tworzenie...' : mode === 'group' ? 'Utwórz dla grupy' : 'Utwórz płatność'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
