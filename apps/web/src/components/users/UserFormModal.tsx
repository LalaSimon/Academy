import { useEffect } from 'react';
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
}

export function UserFormModal({ open, onClose, editUser }: Props) {
  const isEdit = !!editUser;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { role: 'STUDENT' },
  });

  useEffect(() => {
    if (editUser) {
      reset({
        email: editUser.email,
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        role: editUser.role,
        phone: editUser.phone ?? '',
        password: '',
      });
    } else {
      reset({ email: '', firstName: '', lastName: '', role: 'STUDENT', phone: '', password: '' });
    }
  }, [editUser, reset]);

  const onSubmit = async (data: FormValues) => {
    if (isEdit) {
      const { password: _, ...rest } = data;
      await updateUser.mutateAsync({ id: editUser!.id, ...rest, phone: rest.phone || undefined });
    } else {
      await createUser.mutateAsync({ ...data, phone: data.phone || undefined });
    }
    onClose();
  };

  const role = watch('role');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj użytkownika' : 'Nowy użytkownik'}</DialogTitle>
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
              <Input id="password" type="password" {...register('password', { required: !isEdit, minLength: 8 })} />
              {errors.password && <p className="text-xs text-red-500">Min. 8 znaków</p>}
            </div>
          )}

          <div className="space-y-1">
            <Label>Rola</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v as User['role'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrator</SelectItem>
                <SelectItem value="TEACHER">Nauczyciel</SelectItem>
                <SelectItem value="STUDENT">Uczeń</SelectItem>
                <SelectItem value="PARENT">Rodzic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
            <Input id="phone" type="tel" {...register('phone')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-violet-500 hover:bg-violet-600 text-white">
              {isEdit ? 'Zapisz zmiany' : 'Utwórz'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
