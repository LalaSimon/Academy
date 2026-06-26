import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateUser, useUpdateUser, useUsers, type User } from '@/hooks/useUsers';
import { ChevronDown, ChevronUp } from 'lucide-react';

type AccountType = 'TEACHER' | 'STUDENT_ADULT' | 'STUDENT_MINOR' | 'PARENT' | 'ADMIN';

interface FormValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  // parent section
  parentMode: 'existing' | 'new';
  existingParentId: string;
  parentEmail: string;
  parentPassword: string;
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editUser?: User | null;
  fixedRole?: User['role'];
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  TEACHER: 'Nauczyciel',
  STUDENT_ADULT: 'Uczeń pełnoletni',
  STUDENT_MINOR: 'Uczeń niepełnoletni',
  PARENT: 'Rodzic',
  ADMIN: 'Administrator',
};

function accountTypeFromUser(user: User): AccountType {
  if (user.role === 'STUDENT') return user.isMinor ? 'STUDENT_MINOR' : 'STUDENT_ADULT';
  return user.role as AccountType;
}

export function UserFormModal({ open, onClose, editUser, fixedRole }: Props) {
  const isEdit = !!editUser;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [apiError, setApiError] = useState<string | null>(null);

  const defaultAccountType: AccountType = fixedRole
    ? fixedRole === 'STUDENT' ? 'STUDENT_ADULT' : (fixedRole as AccountType)
    : editUser ? accountTypeFromUser(editUser) : 'STUDENT_ADULT';

  const [accountType, setAccountType] = useState<AccountType>(defaultAccountType);
  const [parentExpanded, setParentExpanded] = useState(false);

  const { data: parentsData } = useUsers({ role: 'PARENT', limit: 100 });
  const parents = parentsData?.data ?? [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { parentMode: 'new', existingParentId: '' },
  });

  const parentMode = watch('parentMode');

  useEffect(() => {
    setApiError(null);
    const type = fixedRole
      ? fixedRole === 'STUDENT' ? 'STUDENT_ADULT' : (fixedRole as AccountType)
      : editUser ? accountTypeFromUser(editUser) : 'STUDENT_ADULT';
    setAccountType(type);
    setParentExpanded(false);

    if (editUser) {
      reset({
        email: editUser.email,
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        phone: editUser.phone ?? '',
        password: '',
        parentMode: 'new',
        existingParentId: '',
        parentEmail: '', parentPassword: '', parentFirstName: '', parentLastName: '', parentPhone: '',
      });
    } else {
      reset({
        email: '', firstName: '', lastName: '', phone: '', password: '',
        parentMode: 'new', existingParentId: '',
        parentEmail: '', parentPassword: '', parentFirstName: '', parentLastName: '', parentPhone: '',
      });
    }
  }, [editUser, open, reset]); // eslint-disable-line

  const roleFromType = (t: AccountType): User['role'] => {
    if (t === 'STUDENT_ADULT' || t === 'STUDENT_MINOR') return 'STUDENT';
    return t as User['role'];
  };

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      const role = roleFromType(accountType);
      const isMinor = accountType === 'STUDENT_MINOR';

      if (isEdit) {
        await updateUser.mutateAsync({
          id: editUser!.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          role,
          isMinor,
        });
      } else {
        const payload: Parameters<typeof createUser.mutateAsync>[0] = {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          role,
          isMinor,
        };

        if (isMinor && parentExpanded) {
          if (data.parentMode === 'existing' && data.existingParentId) {
            payload.existingParentId = data.existingParentId;
          } else if (data.parentMode === 'new' && data.parentEmail) {
            payload.parentData = {
              email: data.parentEmail,
              password: data.parentPassword,
              firstName: data.parentFirstName,
              lastName: data.parentLastName,
              phone: data.parentPhone || undefined,
            };
          }
        }

        await createUser.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (Array.isArray(msg)) setApiError(msg.join(', '));
      else setApiError(msg ?? 'Wystąpił błąd. Spróbuj ponownie.');
    }
  };

  const accountTypes: AccountType[] = fixedRole
    ? [defaultAccountType]
    : ['TEACHER', 'STUDENT_ADULT', 'STUDENT_MINOR', 'PARENT', 'ADMIN'];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj użytkownika' : 'Nowy użytkownik'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* Account type selector */}
          <div className="space-y-1.5">
            <Label>Typ konta</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {accountTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setAccountType(t); setParentExpanded(false); }}
                  disabled={isEdit && fixedRole !== undefined}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    accountType === t
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-muted/40 text-muted-foreground border-border hover:border-violet-400'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {ACCOUNT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            {accountType === 'STUDENT_MINOR' && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                Uczeń niepełnoletni nie ma dostępu do zakładki płatności — widzi je tylko rodzic.
              </p>
            )}
          </div>

          {/* Student/user fields */}
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

          <div className="space-y-1">
            <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
            <Input id="phone" type="tel" {...register('phone')} />
          </div>

          {/* Parent section — only for minor students on create */}
          {accountType === 'STUDENT_MINOR' && !isEdit && (
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setParentExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
              >
                <span>Dodaj rodzica <span className="text-muted-foreground font-normal">(opcjonalnie)</span></span>
                {parentExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {parentExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* Mode toggle */}
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setValue('parentMode', 'existing')}
                      className={`flex-1 px-3 py-2 font-medium transition-colors ${parentMode === 'existing' ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-muted/40'}`}
                    >
                      Istniejące konto
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('parentMode', 'new')}
                      className={`flex-1 px-3 py-2 font-medium transition-colors ${parentMode === 'new' ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-muted/40'}`}
                    >
                      Nowe konto
                    </button>
                  </div>

                  {parentMode === 'existing' ? (
                    <div className="space-y-1">
                      <Label>Rodzic</Label>
                      <Select
                        value={watch('existingParentId')}
                        onValueChange={(v: string | null) => v && setValue('existingParentId', v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz rodzica" />
                        </SelectTrigger>
                        <SelectContent>
                          {parents.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.firstName} {p.lastName} ({p.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Imię rodzica</Label>
                          <Input {...register('parentFirstName')} placeholder="Jan" />
                        </div>
                        <div className="space-y-1">
                          <Label>Nazwisko</Label>
                          <Input {...register('parentLastName')} placeholder="Kowalski" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Email rodzica</Label>
                        <Input type="email" {...register('parentEmail')} placeholder="jan@example.com" />
                      </div>
                      <div className="space-y-1">
                        <Label>Hasło rodzica</Label>
                        <Input type="password" {...register('parentPassword', { minLength: 8 })} placeholder="Min. 8 znaków" />
                        {errors.parentPassword && <p className="text-xs text-red-500">Min. 8 znaków</p>}
                      </div>
                      <div className="space-y-1">
                        <Label>Telefon rodzica (opcjonalnie)</Label>
                        <Input type="tel" {...register('parentPhone')} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
