import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, Trash2, UserPlus, BarChart2, Baby, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDeleteUser, useUsers, type User } from '@/hooks/useUsers';
import { UserFormModal } from './UserFormModal';

const ROLE_LABELS: Record<User['role'], string> = {
  ADMIN: 'Admin',
  TEACHER: 'Nauczyciel',
  STUDENT: 'Uczeń',
  PARENT: 'Rodzic',
};

const ROLE_COLORS: Record<User['role'], string> = {
  ADMIN: 'bg-red-500/15 text-red-400 border border-red-500/20',
  TEACHER: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  STUDENT: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  PARENT: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

const AVATAR_COLORS: Record<User['role'], string> = {
  ADMIN: 'bg-red-500/20 text-red-400',
  TEACHER: 'bg-violet-500/20 text-violet-400',
  STUDENT: 'bg-blue-500/20 text-blue-400',
  PARENT: 'bg-emerald-500/20 text-emerald-400',
};

function initials(user: User) {
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
}

function SkeletonRow({ showParent }: { showParent: boolean }) {
  return (
    <TableRow className="border-b border-border/50">
      <TableCell className="py-4 pl-6 pr-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted/50 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded-md bg-muted/50 animate-pulse" />
            <div className="h-2.5 w-20 rounded-md bg-muted/40 animate-pulse" />
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 px-3">
        <div className="h-3 w-40 rounded-md bg-muted/50 animate-pulse" />
      </TableCell>
      <TableCell className="py-4 px-3">
        <div className="h-5 w-20 rounded-full bg-muted/50 animate-pulse" />
      </TableCell>
      <TableCell className="py-4 px-3">
        <div className="h-5 w-16 rounded-full bg-muted/50 animate-pulse" />
      </TableCell>
      {showParent && (
        <TableCell className="py-4 px-3">
          <div className="h-5 w-24 rounded-full bg-muted/50 animate-pulse" />
        </TableCell>
      )}
      <TableCell className="py-4 pl-3 pr-6">
        <div className="flex justify-end gap-1.5">
          <div className="h-7 w-7 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-7 w-7 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </TableCell>
    </TableRow>
  );
}

interface Props {
  roleFilter?: User['role'];
  title: string;
}

export function UsersTable({ roleFilter, title }: Props) {
  const [search, setSearch] = useState('');
  const [minorOnly, setMinorOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const showParent = roleFilter === 'STUDENT';

  const { data, isLoading } = useUsers({
    role: roleFilter,
    search: search || undefined,
    isMinor: showParent && minorOnly ? true : undefined,
    page,
    limit: 20,
  });
  const deleteUser = useDeleteUser();

  const handleEdit = (user: User) => { setEditUser(user); setModalOpen(true); };
  const handleCreate = () => { setEditUser(null); setModalOpen(true); };
  const handleDelete = (id: string) => { if (confirm('Usunąć użytkownika?')) deleteUser.mutate(id); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {data && !isLoading && (
            <p className="text-sm text-muted-foreground mt-0.5">{data.total} rekordów</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showParent && (
            <Button
              variant="ghost"
              onClick={() => { setMinorOnly((v) => !v); setPage(1); }}
              className={`h-9 rounded-xl px-3.5 gap-2 text-sm border transition-colors ${
                minorOnly
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'text-muted-foreground border-border hover:bg-muted/30'
              }`}
              title="Pokaż tylko uczniów niepełnoletnich"
            >
              <Baby className="w-3.5 h-3.5" />
              Tylko niepełnoletni
            </Button>
          )}
          <Input
            placeholder="Szukaj po imieniu, nazwisku, emailu..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            className="w-72 h-9 rounded-xl text-sm"
          />
          <Button
            onClick={handleCreate}
            className="h-9 rounded-xl px-4 gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white' }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Dodaj
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 border-b border-border hover:bg-muted/30">
              <TableHead className="py-3.5 pl-6 pr-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 w-[40%]">
                Osoba
              </TableHead>
              <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Email
              </TableHead>
              <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Rola
              </TableHead>
              <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Status
              </TableHead>
              {showParent && (
                <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Rodzic
                </TableHead>
              )}
              <TableHead className="py-3.5 pl-3 pr-6 w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} showParent={showParent} />)}

            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={showParent ? 6 : 5} className="py-16 text-center text-muted-foreground">
                  Brak użytkowników
                </TableCell>
              </TableRow>
            )}

            {data?.data.map((user, i) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.2 }}
                className="border-b border-border/40 hover:bg-muted/20 transition-colors group"
              >
                <TableCell className="py-3.5 pl-6 pr-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${AVATAR_COLORS[user.role]}`}>
                      {initials(user)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-[13.5px]">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">{user.phone}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell className="py-3.5 px-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 px-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      user.isActive
                        ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/20'
                        : 'bg-muted/50 text-muted-foreground border-border'
                    }`}
                  >
                    {user.isActive ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                </TableCell>
                {showParent && (
                  <TableCell className="py-3.5 px-3">
                    {!user.isMinor ? (
                      <span className="text-xs text-muted-foreground/60">Pełnoletni</span>
                    ) : user.asStudent?.[0]?.parent ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-400 border border-emerald-500/20">
                        {user.asStudent[0].parent.firstName} {user.asStudent[0].parent.lastName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-400 border border-amber-500/20">
                        <UserX className="w-3 h-3" />
                        Brak rodzica
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell className="py-3.5 pl-3 pr-6">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user.role === 'STUDENT' && (
                      <Link to={`/admin/students/${user.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 rounded-lg"
                          title="Profil ucznia"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                    {user.role === 'TEACHER' && (
                      <Link to={`/admin/teachers/${user.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                          title="Statystyki nauczyciela"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 rounded-lg"
                      onClick={() => handleEdit(user)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              {data.total}{' '}
              {roleFilter === 'TEACHER' ? 'nauczycieli' : roleFilter === 'STUDENT' ? 'uczniów' : 'użytkowników'},
              strona {data.page} z {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                Poprzednia
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.totalPages}
              >
                Następna
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserFormModal open={modalOpen} onClose={() => setModalOpen(false)} editUser={editUser} fixedRole={roleFilter} />
    </div>
  );
}
