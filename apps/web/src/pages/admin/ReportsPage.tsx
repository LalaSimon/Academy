import { useState } from "react";
import {
  FileSpreadsheet,
  CreditCard,
  ClipboardList,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroups } from "@/hooks/useGroups";
import { useReportDownload, type ReportType } from "@/hooks/useReports";

const PAYMENT_STATUSES: Record<string, string> = {
  PENDING: "Oczekuje",
  PAID: "Zapłacone",
  OVERDUE: "Zaległe",
  REFUNDED: "Zwrot",
  CANCELLED: "Anulowane",
};

const ROLES: Record<string, string> = {
  STUDENT: "Uczeń",
  PARENT: "Rodzic",
  TEACHER: "Nauczyciel",
  ADMIN: "Administrator",
};

function ReportCard({
  icon: Icon,
  title,
  description,
  children,
  onGenerate,
  loading,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  onGenerate: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>

      <Button
        onClick={onGenerate}
        disabled={loading}
        className="w-full rounded-xl h-9 gap-2 text-white"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
      >
        <FileSpreadsheet className="w-4 h-4" />
        {loading ? "Generuję..." : "Generuj XLSX"}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ReportsPage() {
  const { download, loading } = useReportDownload();
  const { data: groupsData } = useGroups({ limit: 100 });
  const groups = groupsData?.data ?? [];

  // @base-ui Select.Value pokazuje surową wartość (id/bool), nie label —
  // dlatego mapujemy ją ręcznie przez funkcję-children.
  const groupLabel = (v: string) =>
    v ? (groups.find((g) => g.id === v)?.name ?? v) : "Wszystkie";

  // ── Filtry płatności ──────────────────────────────────────────────
  const [pStatus, setPStatus] = useState("");
  const [pGroup, setPGroup] = useState("");
  const [pFrom, setPFrom] = useState("");
  const [pTo, setPTo] = useState("");

  // ── Filtry frekwencji ─────────────────────────────────────────────
  const [aGroup, setAGroup] = useState("");
  const [aFrom, setAFrom] = useState("");
  const [aTo, setATo] = useState("");

  // ── Filtry uczniów ────────────────────────────────────────────────
  const [uRole, setURole] = useState("");
  const [uMinor, setUMinor] = useState("");
  const [uSearch, setUSearch] = useState("");

  const isLoading = (t: ReportType) => loading === t;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Raporty</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ustaw filtry i pobierz gotowy plik Excel ze statystykami.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Płatności */}
        <ReportCard
          icon={CreditCard}
          title="Raport płatności"
          description="Lista płatności z podsumowaniem kwot wg statusu."
          loading={isLoading("payments")}
          onGenerate={() =>
            download("payments", {
              status: pStatus,
              groupId: pGroup,
              from: pFrom,
              to: pTo,
            })
          }
        >
          <Field label="Status">
            <Select
              value={pStatus}
              onValueChange={(v: string | null) => setPStatus(v ?? "")}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Wszystkie statusy">
                  {(v: string) =>
                    v ? (PAYMENT_STATUSES[v] ?? v) : "Wszystkie"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Wszystkie</SelectItem>
                {Object.entries(PAYMENT_STATUSES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Grupa">
            <Select
              value={pGroup}
              onValueChange={(v: string | null) => setPGroup(v ?? "")}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Wszystkie grupy">
                  {groupLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Wszystkie</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Termin od">
            <DatePicker
              value={pFrom}
              onChange={setPFrom}
              className="rounded-xl"
            />
          </Field>
          <Field label="Termin do">
            <DatePicker value={pTo} onChange={setPTo} className="rounded-xl" />
          </Field>
        </ReportCard>

        {/* Frekwencja */}
        <ReportCard
          icon={ClipboardList}
          title="Raport frekwencji"
          description="Obecności uczniów z wyliczoną frekwencją procentową."
          loading={isLoading("attendance")}
          onGenerate={() =>
            download("attendance", {
              groupId: aGroup,
              from: aFrom,
              to: aTo,
            })
          }
        >
          <Field label="Grupa">
            <Select
              value={aGroup}
              onValueChange={(v: string | null) => setAGroup(v ?? "")}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Wszystkie grupy">
                  {groupLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Wszystkie</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Zajęcia od">
            <DatePicker
              value={aFrom}
              onChange={setAFrom}
              className="rounded-xl"
            />
          </Field>
          <Field label="Zajęcia do">
            <DatePicker value={aTo} onChange={setATo} className="rounded-xl" />
          </Field>
        </ReportCard>

        {/* Uczniowie */}
        <ReportCard
          icon={Users}
          title="Raport użytkowników"
          description="Lista użytkowników z rolami i powiązaniami rodzic-dziecko."
          loading={isLoading("students")}
          onGenerate={() =>
            download("students", {
              role: uRole,
              isMinor: uMinor === "" ? undefined : uMinor,
              search: uSearch,
            })
          }
        >
          <Field label="Rola">
            <Select
              value={uRole}
              onValueChange={(v: string | null) => setURole(v ?? "")}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Wszystkie role">
                  {(v: string) => (v ? (ROLES[v] ?? v) : "Wszystkie")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Wszystkie</SelectItem>
                {Object.entries(ROLES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Wiek">
            <Select
              value={uMinor}
              onValueChange={(v: string | null) => setUMinor(v ?? "")}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Wszyscy">
                  {(v: string) =>
                    v === "true"
                      ? "Niepełnoletni"
                      : v === "false"
                        ? "Pełnoletni"
                        : "Wszyscy"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Wszyscy</SelectItem>
                <SelectItem value="true">Niepełnoletni</SelectItem>
                <SelectItem value="false">Pełnoletni</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Szukaj (imię, nazwisko, email)">
              <Input
                value={uSearch}
                onChange={(e) => setUSearch(e.target.value)}
                placeholder="np. Kowalski"
                className="rounded-xl"
              />
            </Field>
          </div>
        </ReportCard>
      </div>
    </div>
  );
}
