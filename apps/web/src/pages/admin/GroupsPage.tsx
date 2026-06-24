import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Pencil, Trash2, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGroups, useDeleteGroup, type Group } from '@/hooks/useGroups';
import { GroupFormModal } from '@/components/groups/GroupFormModal';

function GroupAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-semibold shrink-0">
      {initials.slice(0, 2)}
    </div>
  );
}

export function GroupsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);

  const navigate = useNavigate();
  const { data, isLoading } = useGroups({ search: search || undefined, page, limit: 20 });
  const deleteGroup = useDeleteGroup();

  const handleEdit = (e: React.MouseEvent, g: Group) => { e.stopPropagation(); setEditGroup(g); setModalOpen(true); };
  const handleCreate = () => { setEditGroup(null); setModalOpen(true); };
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Usunąć grupę i wszystkich jej uczniów?')) deleteGroup.mutate(id);
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Grupy</h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Szukaj grupy..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            className="w-64 h-10 rounded-xl border-gray-200"
          />
          <Button onClick={handleCreate} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-10 px-4 gap-2">
            <Plus className="w-4 h-4" />
            Dodaj grupę
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/70 border-b border-gray-100 hover:bg-gray-50/70">
              <TableHead className="py-4 pl-6 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400 w-[35%]">
                Grupa
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Nauczyciel
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Język / Poziom
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Uczniowie
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Status
              </TableHead>
              <TableHead className="py-4 pl-3 pr-6 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-gray-400">Ładowanie...</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Brak grup. Dodaj pierwszą grupę.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((group, i) => (
              <motion.tr
                key={group.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/admin/groups/${group.id}`)}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <TableCell className="py-4 pl-6 pr-3">
                  <div className="flex items-center gap-3">
                    <GroupAvatar name={group.name} />
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{group.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-3 text-sm text-gray-500">
                  {group.teacher.firstName} {group.teacher.lastName}
                </TableCell>
                <TableCell className="py-4 px-3">
                  <div className="flex items-center gap-1.5">
                    {group.language && (
                      <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {group.language}
                      </span>
                    )}
                    {group.level && (
                      <span className="bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {group.level}
                      </span>
                    )}
                    {!group.language && !group.level && <span className="text-gray-300 text-sm">—</span>}
                  </div>
                </TableCell>
                <TableCell className="py-4 px-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>{group._count.students} / {group.maxStudents}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-3">
                  <Badge
                    variant={group.isActive ? 'default' : 'secondary'}
                    className={group.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'text-gray-400'}
                  >
                    {group.isActive ? 'Aktywna' : 'Nieaktywna'}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 pl-3 pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-violet-600 rounded-lg" onClick={(e) => handleEdit(e, group)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 rounded-lg" onClick={(e) => handleDelete(e, group.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/40">
            <p className="text-sm text-gray-500">
              {data.total} grup, strona {data.page} z {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Poprzednia</Button>
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setPage((p) => p + 1)} disabled={page === data.totalPages}>Następna</Button>
            </div>
          </div>
        )}
      </div>

      <GroupFormModal open={modalOpen} onClose={() => setModalOpen(false)} editGroup={editGroup} />
    </div>
  );
}
