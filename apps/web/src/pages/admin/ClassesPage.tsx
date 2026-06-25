import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { ToolbarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfWeek as soW, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Plus, Video, Calendar as CalIcon, List, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Users, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClasses, useDeleteClass, useDeleteBatch, useUpdateClassStatus, type Class, type ClassStatus } from '@/hooks/useClasses';
import { ClassFormModal } from '@/components/classes/ClassFormModal';
import { RecurringClassModal } from '@/components/classes/RecurringClassModal';
import { AttendanceModal } from '@/components/attendance/AttendanceModal';
import { MaterialsPanel } from '@/components/materials/MaterialsPanel';
import { useClassMaterials, useAssignMaterialToClass, useUnassignMaterialFromClass } from '@/hooks/useMaterials';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

function calLabel(date: Date, view: string) {
  if (view === 'month') return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  if (view === 'week') {
    const s = soW(date, { weekStartsOn: 1 });
    const e = endOfWeek(date, { weekStartsOn: 1 });
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
    return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CalToolbar({ date, view, onNavigate, onView }: ToolbarProps<any, any>) {
  return (
    <div className="grid grid-cols-3 items-center mb-4">
      <div className="flex items-center gap-2">
        <button onClick={() => onNavigate('TODAY')} className="px-3 py-1 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          Dziś
        </button>
      </div>
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => onNavigate('PREV')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-52 text-center select-none">
          {calLabel(date, view)}
        </span>
        <button onClick={() => onNavigate('NEXT')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center justify-end">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button key={v} onClick={() => onView(v)}
              className={`px-3 py-1 text-sm transition-colors ${view === v ? 'bg-violet-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {v === 'month' ? 'Miesiąc' : v === 'week' ? 'Tydzień' : 'Dzień'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { pl },
});

const STATUS_LABELS: Record<ClassStatus, string> = {
  SCHEDULED: 'Zaplanowane',
  ONGOING: 'W trakcie',
  COMPLETED: 'Zakończone',
  CANCELLED: 'Odwołane',
};

const STATUS_COLORS: Record<ClassStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const CALENDAR_EVENT_COLORS: Record<ClassStatus, string> = {
  SCHEDULED: '#8b5cf6',
  ONGOING: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

type ViewMode = 'calendar' | 'list';

export function ClassesPage() {
  const [view, setView] = useState<ViewMode>('calendar');
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState<'month' | 'week' | 'day'>(Views.MONTH);
  const [modalOpen, setModalOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editClass, setEditClass] = useState<Class | null>(null);
  const [defaultScheduledAt, setDefaultScheduledAt] = useState<string | undefined>();

  const { data, isLoading } = useClasses({ limit: 200 });
  const deleteClass = useDeleteClass();
  const deleteBatch = useDeleteBatch();
  const updateStatus = useUpdateClassStatus();
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [attendanceClass, setAttendanceClass] = useState<Class | null>(null);
  const [materialsClass, setMaterialsClass] = useState<Class | null>(null);

  const toggleBatch = (batchId: string) =>
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      next.has(batchId) ? next.delete(batchId) : next.add(batchId);
      return next;
    });

  const events = useMemo(() =>
    (data?.data ?? []).map((cls) => ({
      id: cls.id,
      title: cls.title,
      start: new Date(cls.scheduledAt),
      end: new Date(new Date(cls.scheduledAt).getTime() + cls.durationMin * 60_000),
      resource: cls,
    })),
    [data],
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDateTimeStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const handleEdit = (cls: Class) => { setEditClass(cls); setDefaultScheduledAt(undefined); setModalOpen(true); };
  const handleCreate = () => { setEditClass(null); setDefaultScheduledAt(undefined); setModalOpen(true); };
  const handleSlotSelect = ({ start, action }: { start: Date; action: string }) => {
    // on month view clicking a day gives action='click' with midnight — round up to 09:00
    const date = new Date(start);
    if (action === 'click' && date.getHours() === 0) date.setHours(9, 0, 0, 0);
    setEditClass(null);
    setDefaultScheduledAt(toLocalDateTimeStr(date));
    setModalOpen(true);
  };
  const handleDelete = (id: string) => {
    if (confirm('Usunąć te zajęcia?')) deleteClass.mutate(id);
  };
  const handleStatus = (id: string, status: ClassStatus) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Zajęcia</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === 'calendar' ? 'bg-violet-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <CalIcon className="w-3.5 h-3.5" />
              Kalendarz
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-violet-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>
          <Button onClick={() => setRecurringOpen(true)} variant="ghost" className="rounded-xl h-9 px-4 border border-gray-200 text-gray-600 gap-2">
            <Plus className="w-4 h-4" />
            Cyklicznie
          </Button>
          <Button onClick={handleCreate} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-9 px-4 gap-2">
            <Plus className="w-4 h-4" />
            Dodaj zajęcia
          </Button>
        </div>
      </div>

      {view === 'calendar' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4" style={{ height: 640 }}>
            <Calendar
              localizer={localizer}
              events={events}
              date={calDate}
              view={calView}
              onNavigate={setCalDate}
              onView={(v) => setCalView(v as 'month' | 'week' | 'day')}
              selectable
              onSelectEvent={(e) => handleEdit(e.resource as Class)}
              onSelectSlot={handleSlotSelect}
              min={new Date(0, 0, 0, 6, 0)}
              max={new Date(0, 0, 0, 22, 0)}
              scrollToTime={new Date(0, 0, 0, 6, 0)}
              culture="pl"
              components={{ toolbar: CalToolbar }}
              messages={{ showMore: (count) => `+${count} więcej` }}
              eventPropGetter={(e) => ({
                style: {
                  backgroundColor: CALENDAR_EVENT_COLORS[(e.resource as Class).status],
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  padding: '2px 6px',
                },
              })}
            />
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-2">
          {isLoading && <p className="text-center py-16 text-gray-400">Ładowanie...</p>}
          {!isLoading && data?.data.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <CalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Brak zajęć. Dodaj pierwsze zajęcia.
            </div>
          )}
          {(() => {
            const classes = data?.data ?? [];
            // Separate singles from batches
            const singles = classes.filter((c) => !c.batchId);
            const batchMap = new Map<string, Class[]>();
            classes.filter((c) => c.batchId).forEach((c) => {
              const list = batchMap.get(c.batchId!) ?? [];
              list.push(c);
              batchMap.set(c.batchId!, list);
            });

            const ClassRow = ({ cls, i }: { cls: Class; i: number }) => {
              const teacher = cls.teacher ?? cls.group.teacher;
              return (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-violet-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-violet-600 leading-none">
                      {new Date(cls.scheduledAt).toLocaleDateString('pl-PL', { day: '2-digit' })}
                    </span>
                    <span className="text-xs text-violet-400">
                      {new Date(cls.scheduledAt).toLocaleDateString('pl-PL', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{cls.title}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[cls.status]}`}>
                        {STATUS_LABELS[cls.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {cls.group.name} · {new Date(cls.scheduledAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} · {cls.durationMin} min
                      {' · '}{(teacher as { firstName: string | null; lastName: string | null }).firstName} {(teacher as { firstName: string | null; lastName: string | null }).lastName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {cls.meetLink && (
                      <a href={cls.meetLink} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600 rounded-lg">
                          <Video className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    {cls.status === 'SCHEDULED' && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-500 hover:text-amber-700 rounded-lg px-2"
                        onClick={() => handleStatus(cls.id, 'ONGOING')}>Rozpocznij</Button>
                    )}
                    {cls.status === 'ONGOING' && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-green-600 hover:text-green-700 rounded-lg px-2"
                        onClick={() => handleStatus(cls.id, 'COMPLETED')}>Zakończ</Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-violet-600 rounded-lg" title="Materiały"
                      onClick={() => setMaterialsClass(cls)}>
                      <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-violet-600 rounded-lg" title="Obecność"
                      onClick={() => setAttendanceClass(cls)}>
                      <Users className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-violet-600 rounded-lg" onClick={() => handleEdit(cls)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 rounded-lg" onClick={() => handleDelete(cls.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            };

            return (
              <>
                {/* Batch groups */}
                {Array.from(batchMap.entries()).map(([batchId, items], bi) => {
                  const expanded = expandedBatches.has(batchId);
                  const sorted = [...items].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                  const first = sorted[0];
                  const last = sorted[sorted.length - 1];
                  return (
                    <motion.div key={batchId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: bi * 0.03 }}>
                      {/* Batch header */}
                      <div
                        className="bg-white border border-violet-100 rounded-2xl px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-violet-50/40 transition-colors"
                        onClick={() => toggleBatch(batchId)}
                      >
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <RefreshCw className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{first.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {items.length} zajęć · {first.group.name} ·{' '}
                            {new Date(first.scheduledAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                            {' – '}
                            {new Date(last.scheduledAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 text-xs text-red-400 hover:text-red-600 rounded-lg px-2 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Usunąć wszystkie ${items.length} zajęcia z tej serii?`)) deleteBatch.mutate(batchId);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Usuń serię
                        </Button>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
                      </div>
                      {/* Batch items */}
                      {expanded && (
                        <div className="mt-1.5 ml-4 space-y-1.5 border-l-2 border-violet-100 pl-4">
                          {sorted.map((cls, i) => <ClassRow key={cls.id} cls={cls} i={i} />)}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {/* Single classes */}
                {singles.map((cls, i) => <ClassRow key={cls.id} cls={cls} i={i} />)}
              </>
            );
          })()}
        </div>
      )}

      <ClassFormModal open={modalOpen} onClose={() => setModalOpen(false)} editClass={editClass} defaultScheduledAt={defaultScheduledAt} />
      <RecurringClassModal open={recurringOpen} onClose={() => setRecurringOpen(false)} />
      {attendanceClass && (
        <AttendanceModal
          open={!!attendanceClass}
          onClose={() => setAttendanceClass(null)}
          classId={attendanceClass.id}
          classTitle={attendanceClass.title}
        />
      )}
      {materialsClass && (
        <ClassMaterialsModal
          cls={materialsClass}
          onClose={() => setMaterialsClass(null)}
        />
      )}
    </div>
  );
}

function ClassMaterialsModal({ cls, onClose }: { cls: Class; onClose: () => void }) {
  const { data: materials = [] } = useClassMaterials(cls.id);
  const assign = useAssignMaterialToClass();
  const unassign = useUnassignMaterialFromClass();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{cls.title}</h2>
            <p className="text-sm text-gray-500">Materiały do zajęć</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <MaterialsPanel
          assigned={materials}
          onAssign={(materialId) => assign.mutate({ materialId, classId: cls.id })}
          onRemove={(materialId) => unassign.mutate({ materialId, classId: cls.id })}
          isRemoving={unassign.isPending}
        />
      </div>
    </div>
  );
}
