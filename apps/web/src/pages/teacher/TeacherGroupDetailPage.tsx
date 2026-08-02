import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Clock, Mail } from 'lucide-react';
import { useGroup } from '@/hooks/useGroups';
import {
  useGroupMaterials,
  useAssignMaterialToGroup,
  useUnassignMaterialFromGroup,
} from '@/hooks/useMaterials';
import { MaterialsPanel } from '@/components/materials/MaterialsPanel';

const DAYS = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
];

export function TeacherGroupDetailPage() {
  const { groupId = '' } = useParams();

  // Backend odrzuci 403, jeśli to nie jest grupa tego nauczyciela
  // (`assertCanReadGroup`) — nie duplikujemy tej kontroli na froncie.
  const { data: group, isLoading, isError } = useGroup(groupId);
  const { data: materials } = useGroupMaterials(groupId);
  const assign = useAssignMaterialToGroup();
  const unassign = useUnassignMaterialFromGroup();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Ładowanie…</p>;
  }

  if (isError || !group) {
    return (
      <div className="space-y-4">
        <Link
          to="/teacher/groups"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Moje grupy
        </Link>
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nie masz dostępu do tej grupy albo ona nie istnieje.
          </p>
        </div>
      </div>
    );
  }

  const students = group.students ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/teacher/groups"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Moje grupy
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">
          {group.name}
        </h1>
        <div className="flex items-center gap-4 mt-1.5 text-[12.5px] text-muted-foreground flex-wrap">
          <span>{[group.language, group.level].filter(Boolean).join(' · ') || 'Bez poziomu'}</span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {students.length} / {group.maxStudents}
          </span>
        </div>
        {group.description && (
          <p className="text-[13px] text-muted-foreground mt-2">{group.description}</p>
        )}
      </div>

      {/* Harmonogram */}
      {group.schedules.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-[14px] font-medium text-foreground mb-3">Harmonogram</h2>
          <div className="flex flex-wrap gap-2">
            {group.schedules.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-[12.5px] text-foreground"
              >
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {DAYS[s.dayOfWeek] ?? '—'} {s.startTime} · {s.durationMin} min
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Uczniowie */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[14px] font-medium text-foreground">Uczniowie</h2>
        </div>

        {students.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">
            Do tej grupy nie zapisano jeszcze żadnego ucznia.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {students.map((gs, i) => (
              <motion.div
                key={gs.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.2) }}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                >
                  {gs.student.firstName?.[0]}
                  {gs.student.lastName?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-foreground truncate">
                    {gs.student.firstName} {gs.student.lastName}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {gs.student.email}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Materiały */}
      <section className="space-y-3">
        <h2 className="text-[14px] font-medium text-foreground">Materiały grupy</h2>
        <MaterialsPanel
          assigned={materials ?? []}
          onAssign={(materialId) => assign.mutate({ materialId, groupId })}
          onRemove={(materialId) => unassign.mutate({ materialId, groupId })}
          isRemoving={unassign.isPending}
        />
      </section>
    </div>
  );
}
