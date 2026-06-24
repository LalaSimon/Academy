import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, UserMinus, Users, BookOpen, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGroup, useAddStudentToGroup, useRemoveStudentFromGroup } from '@/hooks/useGroups';
import { useUsers } from '@/hooks/useUsers';
import { GroupFormModal } from '@/components/groups/GroupFormModal';
import type { Group } from '@/hooks/useGroups';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: group, isLoading } = useGroup(id!);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const addStudent = useAddStudentToGroup();
  const removeStudent = useRemoveStudentFromGroup();

  const { data: allStudents } = useUsers({ role: 'STUDENT', search: studentSearch || undefined, limit: 50 });

  const enrolledIds = new Set(group?.students.map((s) => s.student.id) ?? []);
  const availableStudents = allStudents?.data.filter((s) => !enrolledIds.has(s.id)) ?? [];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/groups')} className="rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <Badge variant={group.isActive ? 'default' : 'secondary'}
              className={group.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
              {group.isActive ? 'Aktywna' : 'Nieaktywna'}
            </Badge>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Nauczyciel: {group.teacher.firstName} {group.teacher.lastName}
          </p>
        </div>
        <Button variant="ghost" className="gap-2 text-gray-500" onClick={() => setEditModalOpen(true)}>
          <Pencil className="w-4 h-4" />
          Edytuj
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Język', value: group.language ?? '—', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
          { label: 'Poziom', value: group.level ?? '—', icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
          { label: 'Uczniowie', value: `${group._count.students} / ${group.maxStudents}`, icon: Users, color: 'bg-violet-50 text-violet-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-semibold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Students table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Uczniowie w grupie</h2>
          <Button onClick={() => setAddModalOpen(true)} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-9 gap-1.5">
            <UserPlus className="w-4 h-4" />
            Dodaj ucznia
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-semibold text-gray-600">Imię i nazwisko</TableHead>
              <TableHead className="font-semibold text-gray-600">Email</TableHead>
              <TableHead className="font-semibold text-gray-600">Dołączył/a</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.students.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                  Brak uczniów w tej grupie
                </TableCell>
              </TableRow>
            )}
            {group.students.map((gs, i) => (
              <motion.tr
                key={gs.student.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <TableCell className="font-medium text-gray-800">
                  {gs.student.firstName} {gs.student.lastName}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{gs.student.email}</TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {new Date(gs.joinedAt).toLocaleDateString('pl-PL')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                    onClick={() => removeStudent.mutate({ groupId: id!, studentId: gs.student.id })}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add student modal */}
      <Dialog open={addModalOpen} onOpenChange={(v) => !v && setAddModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj ucznia do grupy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Szukaj ucznia..."
              value={studentSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentSearch(e.target.value)}
              className="rounded-xl"
            />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {availableStudents.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">
                  {studentSearch ? 'Brak wyników' : 'Wszyscy uczniowie są już w grupie'}
                </p>
              )}
              {availableStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    addStudent.mutate({ groupId: id!, studentId: s.id });
                    setAddModalOpen(false);
                    setStudentSearch('');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-left group"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </div>
                  <UserPlus className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit group modal */}
      <GroupFormModal open={editModalOpen} onClose={() => setEditModalOpen(false)} editGroup={group as unknown as Group} />
    </div>
  );
}
