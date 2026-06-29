import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
  useCreateClass,
  useUpdateClass,
  useUpdateBatch,
  type Class,
} from "@/hooks/useClasses";
import { useGroups } from "@/hooks/useGroups";
import { useUsers } from "@/hooks/useUsers";

type Mode = "group" | "student";

interface FormValues {
  title: string;
  description: string;
  scheduledAt: string;
  durationMin: number;
  meetLink: string;
  groupId: string;
  studentId: string;
  teacherId: string;
  pricePerClass: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editClass?: Class | null;
  defaultGroupId?: string;
  defaultScheduledAt?: string;
}

export function ClassFormModal({
  open,
  onClose,
  editClass,
  defaultGroupId,
  defaultScheduledAt,
}: Props) {
  const isEdit = !!editClass;
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const updateBatch = useUpdateBatch();
  const [editScope, setEditScope] = useState<"single" | "batch">("single");
  const [mode, setMode] = useState<Mode>("group");
  const [apiError, setApiError] = useState<string | null>(null);
  const { data: groupsData } = useGroups({ limit: 100 });
  const { data: teachersData } = useUsers({ role: "TEACHER", limit: 100 });
  const { data: studentsData } = useUsers({ role: "STUDENT", limit: 100 });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      durationMin: 60,
      groupId: defaultGroupId ?? "",
      studentId: "",
      teacherId: "",
    },
  });

  useEffect(() => {
    setApiError(null);
    setEditScope("single");
    if (editClass) {
      const local = new Date(editClass.scheduledAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      const localStr = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
      const hasGroup = !!editClass.group;
      setMode(hasGroup ? "group" : "student");
      reset({
        title: editClass.title,
        description: editClass.description ?? "",
        scheduledAt: localStr,
        durationMin: editClass.durationMin,
        meetLink: editClass.meetLink ?? "",
        groupId: editClass.group?.id ?? "",
        studentId: (editClass as any).student?.id ?? "",
        teacherId: editClass.teacher?.id ?? editClass.group?.teacher?.id ?? "",
      });
    } else {
      setMode("group");
      reset({
        title: "",
        description: "",
        scheduledAt: defaultScheduledAt ?? "",
        durationMin: 60,
        meetLink: "",
        groupId: defaultGroupId ?? "",
        studentId: "",
        teacherId: "",
      });
    }
  }, [editClass, open, reset, defaultGroupId, defaultScheduledAt]); // eslint-disable-line

  const groupId = watch("groupId");
  const studentId = watch("studentId");
  const teacherId = watch("teacherId");

  const handleGroupChange = (v: string) => {
    setValue("groupId", v);
    const group = groupsData?.data.find((g) => g.id === v);
    if (group) setValue("teacherId", group.teacher.id);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setValue("groupId", "");
    setValue("studentId", "");
    setValue("teacherId", "");
  };

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      const base = {
        title: data.title,
        description: data.description || undefined,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        durationMin: data.durationMin,
        meetLink: data.meetLink || undefined,
        teacherId: data.teacherId || undefined,
        pricePerClass: data.pricePerClass || undefined,
      };

      if (isEdit) {
        if (editScope === "batch" && editClass!.batchId) {
          const { scheduledAt, ...rest } = base;
          await updateBatch.mutateAsync({
            batchId: editClass!.batchId,
            ...rest,
            scheduledAtTemplate: scheduledAt,
          });
        } else {
          await updateClass.mutateAsync({ id: editClass!.id, ...base });
        }
      } else {
        const payload =
          mode === "group"
            ? { ...base, groupId: data.groupId }
            : { ...base, studentId: data.studentId };
        await createClass.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      if (Array.isArray(msg)) setApiError(msg.join(", "));
      else setApiError(msg ?? "Wystąpił błąd. Spróbuj ponownie.");
    }
  };

  const selectedTeacher = teachersData?.data.find((t) => t.id === teacherId);
  const selectedGroup = groupsData?.data.find((g) => g.id === groupId);
  const selectedStudent = studentsData?.data.find((s) => s.id === studentId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edytuj zajęcia" : "Nowe zajęcia"}
          </DialogTitle>
        </DialogHeader>

        {/* Edit scope (batch) */}
        {isEdit && editClass?.batchId && (
          <div className="flex rounded-xl border border-border overflow-hidden text-sm mt-3">
            <button
              type="button"
              onClick={() => setEditScope("single")}
              className={`flex-1 py-2 font-medium transition-colors ${editScope === "single" ? "bg-violet-500 text-white" : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              Tylko te zajęcia
            </button>
            <button
              type="button"
              onClick={() => setEditScope("batch")}
              className={`flex-1 py-2 font-medium transition-colors ${editScope === "batch" ? "bg-violet-500 text-white" : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              Całą serię
            </button>
          </div>
        )}

        {/* Mode toggle (create only) */}
        {!isEdit && (
          <div className="flex rounded-xl border border-border overflow-hidden text-sm mt-3">
            <button
              type="button"
              onClick={() => handleModeChange("group")}
              className={`flex-1 py-2 font-medium transition-colors ${mode === "group" ? "bg-violet-500 text-white" : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              Dla grupy
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("student")}
              className={`flex-1 py-2 font-medium transition-colors ${mode === "student" ? "bg-violet-500 text-white" : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              Dla ucznia (1:1)
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="title">Tytuł</Label>
            <Input
              id="title"
              {...register("title", { required: true })}
              placeholder="np. Angielski — lekcja 5"
            />
            {errors.title && <p className="text-xs text-red-500">Wymagane</p>}
          </div>

          {/* Group or Student selector */}
          {mode === "group" ? (
            <div className="space-y-1">
              <Label>Grupa</Label>
              <Select
                value={groupId ?? ""}
                onValueChange={(v: string | null) => v && handleGroupChange(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedGroup ? (
                      selectedGroup.name
                    ) : (
                      <span className="text-muted-foreground">
                        Wybierz grupę
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {groupsData?.data.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Uczeń</Label>
              <Select
                value={studentId ?? ""}
                onValueChange={(v: string | null) =>
                  v && setValue("studentId", v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedStudent ? (
                      `${selectedStudent.firstName} ${selectedStudent.lastName}`
                    ) : (
                      <span className="text-muted-foreground">
                        Wybierz ucznia
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {studentsData?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Nauczyciel prowadzący</Label>
            <Select
              value={teacherId ?? ""}
              onValueChange={(v: string | null) =>
                v && setValue("teacherId", v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedTeacher ? (
                    `${selectedTeacher.firstName ?? ""} ${selectedTeacher.lastName ?? ""}`.trim()
                  ) : (
                    <span className="text-muted-foreground">
                      Wybierz nauczyciela
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teachersData?.data.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName ?? ""} {t.lastName ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="scheduledAt">
                {editScope === "batch"
                  ? "Wzorzec — pierwsza lekcja serii"
                  : "Data i godzina"}
              </Label>
              <Controller
                control={control}
                name="scheduledAt"
                rules={{ required: true }}
                render={({ field }) => {
                  const [datePart = "", timePart = ""] = (
                    field.value ?? ""
                  ).split("T");
                  const combine = (d: string, t: string) =>
                    d ? `${d}T${t || "12:00"}` : "";
                  return (
                    <div className="flex gap-2">
                      <DatePicker
                        id="scheduledAt"
                        value={datePart}
                        onChange={(d) => field.onChange(combine(d, timePart))}
                        className="flex-1"
                      />
                      <Input
                        type="time"
                        aria-label="Godzina"
                        value={timePart}
                        onChange={(e) =>
                          field.onChange(combine(datePart, e.target.value))
                        }
                        className="w-32"
                      />
                    </div>
                  );
                }}
              />
              {editScope === "batch" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Wszystkie zajęcia w serii przesuną się o tę samą liczbę dni i
                  przyjmą tę samą godzinę.
                </p>
              )}
              {errors.scheduledAt && (
                <p className="text-xs text-red-500">Wymagane</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="durationMin">Czas trwania (min)</Label>
              <Input
                id="durationMin"
                type="number"
                min={15}
                max={480}
                step={15}
                {...register("durationMin", { valueAsNumber: true })}
              />
            </div>
            {!isEdit && (
              <div className="space-y-1">
                <Label htmlFor="pricePerClass">Cena za lekcję (PLN)</Label>
                <Input
                  id="pricePerClass"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="120.00"
                  {...register("pricePerClass")}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="meetLink">Link Meet (opcjonalnie)</Label>
              <Input
                id="meetLink"
                {...register("meetLink")}
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Temat zajęć..."
            />
          </div>

          {apiError && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {apiError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-violet-500 hover:bg-violet-600 text-white"
            >
              {isSubmitting
                ? "Zapisywanie..."
                : isEdit
                  ? "Zapisz zmiany"
                  : "Utwórz zajęcia"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
