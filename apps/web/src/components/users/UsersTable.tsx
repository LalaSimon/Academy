import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  ADMIN: 'bg-red-100 text-red-700',
  TEACHER: 'bg-violet-100 text-violet-700',
  STUDENT: 'bg-blue-100 text-blue-700',
  PARENT: 'bg-green-100 text-green-700',
};

interface Props {
  roleFilter?: User['role'];
  title: string;
}

export function UsersTable({ roleFilter, title }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const { data, isLoading } = useUsers({ role: roleFilter, search: search || undefined, page, limit: 20 });
  const deleteUser = useDeleteUser();

  const handleEdit = (user: User) => { setEditUser(user); setModalOpen(true); };
  const handleCreate = () => { setEditUser(null); setModalOpen(true); };
  const handleDelete = (id: string) => { if (confirm('Usunąć użytkownika?')) deleteUser.mutate(id); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Szukaj po imieniu, nazwisku, emailu..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            className="w-72 h-9 rounded-xl border-gray-200"
          />
          <Button onClick={handleCreate} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-9 gap-1.5">
            <UserPlus className="w-4 h-4" />
            Dodaj
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-semibold text-gray-600">Imię i nazwisko</TableHead>
              <TableHead className="font-semibold text-gray-600">Email</TableHead>
              <TableHead className="font-semibold text-gray-600">Rola</TableHead>
              <TableHead className="font-semibold text-gray-600">Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">Ładowanie...</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">Brak użytkowników</TableCell>
              </TableRow>
            )}
            {data?.data.map((user, i) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <TableCell className="font-medium text-gray-800">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{user.email}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'secondary'} className={user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                    {user.isActive ? 'Aktywny' : 'Nieaktywny'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-violet-600" onClick={() => handleEdit(user)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-sm text-gray-500">
              {data.total} użytkowników, strona {data.page} z {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Poprzednia</Button>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === data.totalPages}>Następna</Button>
            </div>
          </div>
        )}
      </div>

      <UserFormModal open={modalOpen} onClose={() => setModalOpen(false)} editUser={editUser} />
    </div>
  );
}
