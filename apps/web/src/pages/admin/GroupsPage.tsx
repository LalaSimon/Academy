import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Pencil, Trash2, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGroups, useDeleteGroup, type Group } from '@/hooks/useGroups';
import { GroupFormModal } from '@/components/groups/GroupFormModal';

const LANGUAGE_COLORS: Record<string, string> = {
  default: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
};

const LEVEL_COLORS: Record<string, string> = {
  default: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

function GroupCard({ group, onEdit, onDelete, onClick }: {
  group: Group;
  onEdit: (e: React.MouseEvent, g: Group) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onClick: () => void;
}) {
  const occupancy = group.maxStudents > 0 ? (group._count.students / group.maxStudents) : 0;
  const isFull = occupancy >= 1;
  const isNearFull = occupancy >= 0.8;

  return (
    <div
      onClick={onClick}
      className="relative bg-card rounded-2xl border border-border p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 group hover:border-violet-500/30"
      style={{ '--hover-shadow': '0 0 24px rgba(139,92,246,0.08)' } as React.CSSProperties}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 24px rgba(139,92,246,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-[14.5px] truncate">{group.name}</h3>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 truncate">
            {group.teacher.firstName} {group.teacher.lastName}
          </p>
        </div>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
            group.isActive
              ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/20'
              : 'bg-muted/40 text-muted-foreground border-border'
          }`}
        >
          {group.isActive ? 'Aktywna' : 'Nieaktywna'}
        </span>
      </div>

      {(group.language || group.level) && (
        <div className="flex items-center gap-2 flex-wrap">
          {group.language && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${LANGUAGE_COLORS.default}`}>
              {group.language}
            </span>
          )}
          {group.level && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS.default}`}>
              {group.level}
            </span>
          )}
        </div>
      )}

      {/* Capacity */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>
              {group._count.students} / {group.maxStudents}
            </span>
          </div>
          <span
            className={`text-[11px] font-medium ${
              isFull ? 'text-red-400' : isNearFull ? 'text-amber-400' : 'text-muted-foreground'
            }`}
          >
            {isFull ? 'Pełna' : isNearFull ? 'Prawie pełna' : `${group.maxStudents - group._count.students} miejsc`}
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, occupancy * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="h-full rounded-full"
            style={{
              background: isFull
                ? 'linear-gradient(to right, #f87171, #ef4444)'
                : isNearFull
                ? 'linear-gradient(to right, #fbbf24, #f59e0b)'
                : 'linear-gradient(to right, #8b5cf6, #6366f1)',
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 pt-0.5 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 rounded-lg"
          onClick={(e) => onEdit(e, group)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg"
          onClick={(e) => onDelete(e, group.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded-md bg-muted/50 animate-pulse" />
          <div className="h-3 w-24 rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="h-5 w-14 rounded-full bg-muted/40 animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-4 w-16 rounded-full bg-muted/40 animate-pulse" />
        <div className="h-4 w-12 rounded-full bg-muted/40 animate-pulse" />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <div className="h-3 w-12 rounded bg-muted/40 animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/40 animate-pulse" />
      </div>
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

  const handleEdit = (e: React.MouseEvent, g: Group) => {
    e.stopPropagation();
    setEditGroup(g);
    setModalOpen(true);
  };
  const handleCreate = () => { setEditGroup(null); setModalOpen(true); };
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Usunąć grupę i wszystkich jej uczniów?')) deleteGroup.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Grupy</h1>
          {data && !isLoading && (
            <p className="text-sm text-muted-foreground mt-0.5">{data.total} grup</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Szukaj grupy..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            className="w-56 h-9 rounded-xl text-sm"
          />
          <Button
            onClick={handleCreate}
            className="h-9 rounded-xl px-4 gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Dodaj grupę
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!isLoading && data?.data.length === 0 && (
        <div className="bg-card rounded-2xl border border-border py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Brak grup. Dodaj pierwszą grupę.</p>
        </div>
      )}

      {!isLoading && (data?.data.length ?? 0) > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <GroupCard
                group={group}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClick={() => navigate(`/admin/groups/${group.id}`)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {data.total} grup, strona {data.page} z {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              Poprzednia
            </Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setPage((p) => p + 1)} disabled={page === data.totalPages}>
              Następna
            </Button>
          </div>
        </div>
      )}

      <GroupFormModal open={modalOpen} onClose={() => setModalOpen(false)} editGroup={editGroup} />
    </div>
  );
}
