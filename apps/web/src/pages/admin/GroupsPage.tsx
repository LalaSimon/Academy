import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Pencil, Trash2, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGroups, useDeleteGroup, type Group } from '@/hooks/useGroups';
import { GroupFormModal } from '@/components/groups/GroupFormModal';

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
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Grupy</h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Szukaj grupy..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            className="w-64 h-9 rounded-xl border-gray-200"
          />
          <Button onClick={handleCreate} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-9 gap-1.5">
            <Plus className="w-4 h-4" />
            Dodaj grupę
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">Ładowanie...</div>
      )}

      {!isLoading && data?.data.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Brak grup. Dodaj pierwszą grupę.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((group, i) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(`/admin/groups/${group.id}`)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-violet-100 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {group.teacher.firstName} {group.teacher.lastName}
                </p>
              </div>
              <Badge variant={group.isActive ? 'default' : 'secondary'}
                className={group.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100 shrink-0' : 'shrink-0'}>
                {group.isActive ? 'Aktywna' : 'Nieaktywna'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-500">
              {group.language && (
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  {group.language}
                </span>
              )}
              {group.level && (
                <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  {group.level}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-50">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="w-3.5 h-3.5" />
                <span>{group._count.students} / {group.maxStudents}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-violet-600" onClick={(e) => handleEdit(e, group)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={(e) => handleDelete(e, group.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">{data.total} grup, strona {data.page} z {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Poprzednia</Button>
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === data.totalPages}>Następna</Button>
          </div>
        </div>
      )}

      <GroupFormModal open={modalOpen} onClose={() => setModalOpen(false)} editGroup={editGroup} />
    </div>
  );
}
