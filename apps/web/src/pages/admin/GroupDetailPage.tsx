import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Users,
  BookOpen,
  Pencil,
  Calendar,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGroup,
  useAddStudentToGroup,
  useRemoveStudentFromGroup,
  useAddGroupSchedule,
  useRemoveGroupSchedule,
  useGenerateClasses,
  type GroupSchedulePayload,
  type Group,
} from "@/hooks/useGroups";
import { useUsers } from "@/hooks/useUsers";
import { useClasses } from "@/hooks/useClasses";
import { GroupFormModal } from "@/components/groups/GroupFormModal";
import { MaterialsPanel } from "@/components/materials/MaterialsPanel";
import {
  useGroupMaterials,
  useAssignMaterialToGroup,
  useUnassignMaterialFromGroup,
} from "@/hooks/useMaterials";

const DAY_LABELS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

const DEFAULT_SLOT: GroupSchedulePayload = {
  dayOfWeek: 0,
  startTime: "18:00",
  durationMin: 60,
  pricePerClass: "",
};

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: group, isLoading } = useGroup(id!);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [newSlot, setNewSlot] = useState<GroupSchedulePayload>({
    ...DEFAULT_SLOT,
  });
  const [genYear, setGenYear] = useState(() => new Date().getFullYear());
  const [genMonth, setGenMonth] = useState(() => new Date().getMonth() + 1);
  const [generateResult, setGenerateResult] = useState<{
    created: number;
  } | null>(null);

  const addStudent = useAddStudentToGroup();
  const removeStudent = useRemoveStudentFromGroup();
  const addSchedule = useAddGroupSchedule();
  const removeSchedule = useRemoveGroupSchedule();
  const generateClasses = useGenerateClasses();
  const { data: groupMaterials = [] } = useGroupMaterials(id!);
  const { data: upcomingClasses } = useClasses({ groupId: id!, limit: 10 });
  const assignMaterial = useAssignMaterialToGroup();
  const unassignMaterial = useUnassignMaterialFromGroup();

  const { data: allStudents } = useUsers({
    role: "STUDENT",
    search: studentSearch || undefined,
    limit: 50,
  });

  const enrolledIds = new Set(group?.students.map((s) => s.student.id) ?? []);
  const availableStudents =
    allStudents?.data.filter((s) => !enrolledIds.has(s.id)) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/groups")}
          className="rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <Badge
              variant={group.isActive ? "default" : "secondary"}
              className={
                group.isActive
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : ""
              }
            >
              {group.isActive ? "Aktywna" : "Nieaktywna"}
            </Badge>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Nauczyciel: {group.teacher.firstName} {group.teacher.lastName}
          </p>
        </div>
        <Button
          variant="ghost"
          className="gap-2 text-gray-500"
          onClick={() => setEditModalOpen(true)}
        >
          <Pencil className="w-4 h-4" />
          Edytuj
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Język",
            value: group.language ?? "—",
            icon: BookOpen,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Poziom",
            value: group.level ?? "—",
            icon: BookOpen,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Uczniowie",
            value: `${group._count.students} / ${group.maxStudents}`,
            icon: Users,
            color: "bg-violet-50 text-violet-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
            >
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
          <Button
            onClick={() => setAddModalOpen(true)}
            className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-9 gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Dodaj ucznia
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/70 border-b border-gray-100 hover:bg-gray-50/70">
              <TableHead className="py-4 pl-6 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400 w-[40%]">
                Uczeń
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Email
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Dołączył/a
              </TableHead>
              <TableHead className="py-4 pl-3 pr-6 w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.students.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-16 text-center text-gray-400"
                >
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
                <TableCell className="py-4 pl-6 pr-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold shrink-0">
                      {`${gs.student.firstName?.[0] ?? ""}${gs.student.lastName?.[0] ?? ""}`.toUpperCase()}
                    </div>
                    <p className="font-medium text-gray-900">
                      {gs.student.firstName} {gs.student.lastName}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-3 text-sm text-gray-500">
                  {gs.student.email}
                </TableCell>
                <TableCell className="py-4 px-3 text-sm text-gray-400">
                  {new Date(gs.joinedAt).toLocaleDateString("pl-PL")}
                </TableCell>
                <TableCell className="py-4 pl-3 pr-6">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500 rounded-lg"
                      onClick={() =>
                        removeStudent.mutate({
                          groupId: id!,
                          studentId: gs.student.id,
                        })
                      }
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Upcoming classes from calendar */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">
              Zajęcia w kalendarzu
            </h2>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {upcomingClasses?.total ?? 0}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/classes`)}
            className="text-xs text-muted-foreground gap-1.5"
          >
            Przejdź do zajęć →
          </Button>
        </div>
        <div className="divide-y divide-border/50">
          {!upcomingClasses || upcomingClasses.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Brak zajęć — dodaj w widoku Zajęcia lub wygeneruj z szablonu
              poniżej
            </p>
          ) : (
            upcomingClasses.data
              .sort(
                (a, b) =>
                  new Date(a.scheduledAt).getTime() -
                  new Date(b.scheduledAt).getTime(),
              )
              .map((cls) => {
                const dt = new Date(cls.scheduledAt);
                const STATUS_COLORS: Record<string, string> = {
                  SCHEDULED: "bg-blue-500/15 text-blue-400",
                  ONGOING: "bg-emerald-500/15 text-emerald-400",
                  COMPLETED: "bg-muted/40 text-muted-foreground",
                  CANCELLED: "bg-red-500/15 text-red-400",
                };
                const STATUS_LABELS: Record<string, string> = {
                  SCHEDULED: "Zaplanowane",
                  ONGOING: "W trakcie",
                  COMPLETED: "Zakończone",
                  CANCELLED: "Odwołane",
                };
                return (
                  <div
                    key={cls.id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <div className="w-10 text-center flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {dt.toLocaleDateString("pl-PL", { month: "short" })}
                      </p>
                      <p className="text-base font-bold text-foreground leading-tight">
                        {dt.getDate()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {dt.toLocaleTimeString("pl-PL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {cls.title}
                      </p>
                      {cls.teacher && (
                        <p className="text-xs text-muted-foreground">
                          {cls.teacher.firstName} {cls.teacher.lastName}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[cls.status] ?? ""}`}
                    >
                      {STATUS_LABELS[cls.status] ?? cls.status}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Schedule templates section */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">
              Szablon harmonogramu
            </h2>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {group.schedules.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGenerateResult(null);
                setGenerateModalOpen(true);
              }}
              className="gap-1.5 text-violet-600 hover:text-violet-700"
            >
              <Zap className="w-3.5 h-3.5" />
              Generuj zajęcia
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewSlot({ ...DEFAULT_SLOT });
                setScheduleModalOpen(true);
              }}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj termin
            </Button>
          </div>
        </div>

        <div className="p-5">
          {group.schedules.length === 0 ? (
            <div className="py-5 text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Brak terminów — dodaj co najmniej jeden żeby generować zajęcia
              </p>
              <p className="text-xs text-muted-foreground/60">
                Każdy termin to jeden dzień w tygodniu z godziną. Dwa terminy =
                2x w tygodniu.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {group.schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-500 dark:text-violet-400 flex items-center justify-center text-xs font-bold">
                      {DAY_LABELS[s.dayOfWeek].slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {DAY_LABELS[s.dayOfWeek]}, {s.startTime} ·{" "}
                        {s.durationMin} min
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Number(s.pricePerClass).toFixed(2)} PLN/lekcję · od{" "}
                        {new Date(s.effectiveFrom).toLocaleDateString("pl-PL")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      removeSchedule.mutate({ groupId: id!, scheduleId: s.id })
                    }
                    className="text-muted-foreground/40 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Materials section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Materiały grupy</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {groupMaterials.length}
            </span>
          </div>
        </div>
        <div className="p-5">
          <MaterialsPanel
            assigned={groupMaterials}
            onAssign={(materialId) =>
              assignMaterial.mutate({ materialId, groupId: id! })
            }
            onRemove={(materialId) =>
              unassignMaterial.mutate({ materialId, groupId: id! })
            }
            isRemoving={unassignMaterial.isPending}
          />
        </div>
      </div>

      {/* Add student modal */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(v) => !v && setAddModalOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj ucznia do grupy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Szukaj ucznia..."
              value={studentSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStudentSearch(e.target.value)
              }
              className="rounded-xl"
            />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {availableStudents.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">
                  {studentSearch
                    ? "Brak wyników"
                    : "Wszyscy uczniowie są już w grupie"}
                </p>
              )}
              {availableStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    addStudent.mutate({ groupId: id!, studentId: s.id });
                    setAddModalOpen(false);
                    setStudentSearch("");
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-left group"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {s.firstName} {s.lastName}
                    </p>
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
      <GroupFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editGroup={group as unknown as Group}
      />

      {/* Add schedule slot modal */}
      <Dialog
        open={scheduleModalOpen}
        onOpenChange={(v) => !v && setScheduleModalOpen(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Dodaj termin zajęć</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Dzień tygodnia</Label>
              <Select
                value={String(newSlot.dayOfWeek)}
                onValueChange={(v: string | null) =>
                  v && setNewSlot((s) => ({ ...s, dayOfWeek: Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue>{DAY_LABELS[newSlot.dayOfWeek]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Godzina</Label>
                <Input
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) =>
                    setNewSlot((s) => ({ ...s, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Czas trwania (min)</Label>
                <Input
                  type="number"
                  min={15}
                  max={480}
                  value={newSlot.durationMin}
                  onChange={(e) =>
                    setNewSlot((s) => ({
                      ...s,
                      durationMin: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cena za lekcję (PLN)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="120.00"
                value={newSlot.pricePerClass}
                onChange={(e) =>
                  setNewSlot((s) => ({ ...s, pricePerClass: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Obowiązuje od</Label>
              <DatePicker
                value={newSlot.effectiveFrom ?? ""}
                onChange={(v) =>
                  setNewSlot((s) => ({ ...s, effectiveFrom: v || undefined }))
                }
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setScheduleModalOpen(false)}
              >
                Anuluj
              </Button>
              <Button
                className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
                disabled={!newSlot.pricePerClass || addSchedule.isPending}
                onClick={() => {
                  addSchedule.mutate(
                    { groupId: id!, ...newSlot },
                    { onSuccess: () => setScheduleModalOpen(false) },
                  );
                }}
              >
                {addSchedule.isPending ? "Zapisywanie..." : "Dodaj termin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate classes modal */}
      <Dialog
        open={generateModalOpen}
        onOpenChange={(v) => !v && setGenerateModalOpen(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generuj zajęcia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {generateResult ? (
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6" />
                </div>
                <p className="font-medium text-gray-800">
                  Wygenerowano {generateResult.created} zajęć
                </p>
                <p className="text-sm text-gray-400">
                  Istniejące zajęcia zostały pominięte
                </p>
                <Button
                  className="w-full bg-violet-500 hover:bg-violet-600 text-white"
                  onClick={() => setGenerateModalOpen(false)}
                >
                  Zamknij
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  Generuje zajęcia dla <strong>{group.name}</strong> na
                  podstawie harmonogramu. Istniejące zajęcia są pomijane
                  (idempotentne).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Rok</Label>
                    <Input
                      type="number"
                      min={2024}
                      max={2030}
                      value={genYear}
                      onChange={(e) => setGenYear(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Miesiąc</Label>
                    <Select
                      value={String(genMonth)}
                      onValueChange={(v: string | null) =>
                        v && setGenMonth(Number(v))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {new Date(genYear, genMonth - 1, 1).toLocaleString(
                            "pl",
                            { month: "long" },
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(2026, i, 1).toLocaleString("pl", {
                              month: "long",
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setGenerateModalOpen(false)}
                  >
                    Anuluj
                  </Button>
                  <Button
                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
                    disabled={
                      generateClasses.isPending || !group.schedules.length
                    }
                    onClick={() => {
                      generateClasses.mutate(
                        { groupId: id!, year: genYear, month: genMonth },
                        {
                          onSuccess: (data) =>
                            setGenerateResult({ created: data.created }),
                        },
                      );
                    }}
                  >
                    {generateClasses.isPending ? "Generowanie..." : "Generuj"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
