import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateUser, useUpdateUser, type User } from '@/hooks/useUsers';

interface FormValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  phone: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editUser?: User | null;
  fixedRole?: User['role'];
}

const ROLE_LABELS: Record<User['role'], string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Nauczyciel',
  STUDENT: 'Uczeń',
  PARENT: 'Rodzic',
};

export function UserFormModal({ open, onClose, editUser, fixedRole }: Props) {
  const isEdit = !!editUser;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [apiError, setApiError] = useState<string | null>(null);

  const defaultRole = fixedRole ?? editUser?.role ?? 'STUDENT';

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { role: defaultRole },
  });

  useEffect(() => {
    setApiError(null);
    if (editUser) {
      reset({
        email: editUser.email,
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        role: fixedRole ?? editUser.role,
        phone: editUser.phone ?? '',
        password: '',
      });
    } else {
      reset({ email: '', firstName: '', lastName: '', role: defaultRole, phone: '', password: '' });
    }
  }, [editUser, open, reset]);  // eslint-disable-line

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      if (isEdit) {
        const { password: _p, ...rest } = data;
        await updateUser.mutateAsync({ id: editUser!.id, ...rest, phone: rest.phone || undefined });
      } else {
        await createUser.mutateAsync({ ...data, phone: data.phone || undefined });
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (Array.isArray(msg)) setApiError(msg.join(', '));
      else setApiError(msg ?? 'Wystąpił błąd. Spróbuj ponownie.');
    }
  };

  const role = watch('role');

  const titleMap: Record<User['role'], string> = {
    TEACHER: 'nauczyciela',
    STUDENT: 'ucznia',
    ADMIN: 'administratora',
    PARENT: 'rodzica',
  };

  const contextLabel = fixedRole ? titleMap[fixedRole] : 'użytkownika';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edytuj ${contextLabel}` : `Nowy ${contextLabel}`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">Imię</Label>
              <Input id="firstName" {...register('firstName', { required: true })} />
              {errors.firstName && <p className="text-xs text-red-500">Wymagane</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input id="lastName" {...register('lastName', { required: true })} />
              {errors.lastName && <p className="text-xs text-red-500">Wymagane</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email', { required: true })} disabled={isEdit} />
            {errors.email && <p className="text-xs text-red-500">Wymagane</p>}
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="password">Hasło</Label>
              <Input id="password" type="password" {...register('password', { required: !isEdit, minLength: 8 })} placeholder="Min. 8 znaków" />
              {errors.password && <p className="text-xs text-red-500">Min. 8 znaków</p>}
            </div>
          )}

          {!fixedRole && (
            <div className="space-y-1">
              <Label>Rola</Label>
              <Select value={role ?? ''} onValueChange={(v: string | null) => v && setValue('role', v as User['role'])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz rolę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="TEACHER">Nauczyciel</SelectItem>
                  <SelectItem value="STUDENT">Uczeń</SelectItem>
                  <SelectItem value="PARENT">Rodzic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {fixedRole && (
            <div className="space-y-1">
              <Label>Rola</Label>
              <div className="h-8 px-2.5 flex items-center text-sm rounded-lg border border-input bg-muted text-muted-foreground">
                {ROLE_LABELS[fixedRole]}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
            <Input id="phone" type="tel" {...register('phone')} />
          </div>

          {apiError && (
            <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{apiError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={isSubmitting} className="text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utwórz'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
